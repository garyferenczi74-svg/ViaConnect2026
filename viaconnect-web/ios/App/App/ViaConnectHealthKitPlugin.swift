import Foundation
import Capacitor
import HealthKit

/// Read-only Apple Health step count. VIA-9.
/// Apple 2.5.1 and 5.1.3: HealthKit is used for a real fitness read.
/// Apple 5.1.1(iii) and 5.1.3(i): the only type requested is step count.
/// This plugin does not save samples and does not request write access.
@objc(ViaConnectHealthKitPlugin)
public class ViaConnectHealthKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ViaConnectHealthKitPlugin"
    public let jsName = "ViaConnectHealthKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryHKitSampleType", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data is not available on this device")
            return
        }
        guard let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Step count is not available")
            return
        }
        // Ignore any other read or write types the caller names. v1 is step count only.
        store.requestAuthorization(toShare: [], read: [stepType]) { success, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["granted": success])
        }
    }

    @objc func queryHKitSampleType(_ call: CAPPluginCall) {
        let sampleName = call.getString("sampleName") ?? ""
        let allowed = ["stepCount", "steps", "HKQuantityTypeIdentifierStepCount"]
        guard allowed.contains(sampleName) else {
            call.reject("Only step count can be read in this version")
            return
        }
        guard let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Step count is not available")
            return
        }

        let end = parseIso(call.getString("endDate")) ?? Date()
        let start = parseIso(call.getString("startDate")) ?? end.addingTimeInterval(-7 * 24 * 60 * 60)
        var limit = call.getInt("limit") ?? 100
        if limit < 1 { limit = 1 }
        if limit > 500 { limit = 500 }

        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: stepType, predicate: predicate, limit: limit, sortDescriptors: [sort]) { _, samples, error in
            if let error = error {
                call.reject(error.localizedDescription)
                return
            }
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let rows: [[String: Any]] = (samples ?? []).compactMap { sample in
                guard let quantitySample = sample as? HKQuantitySample else { return nil }
                return [
                    "uuid": quantitySample.uuid.uuidString,
                    "value": quantitySample.quantity.doubleValue(for: HKUnit.count()),
                    "startDate": formatter.string(from: quantitySample.startDate),
                    "endDate": formatter.string(from: quantitySample.endDate),
                    "sourceName": quantitySample.sourceRevision.source.name,
                    "sourceBundleId": quantitySample.sourceRevision.source.bundleIdentifier,
                ]
            }
            call.resolve(["resultData": rows])
        }
        store.execute(query)
    }

    private func parseIso(_ value: String?) -> Date? {
        guard let value = value, !value.isEmpty else { return nil }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let parsed = formatter.date(from: value) { return parsed }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: value)
    }
}
