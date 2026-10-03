import Capacitor

/// Registers the in-repo HealthKit plugin. It is not an npm package, so
/// Capacitor's package class list does not include it. capacitorDidLoad
/// runs after the bridge exists.
class ViaConnectBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ViaConnectHealthKitPlugin())
    }
}
