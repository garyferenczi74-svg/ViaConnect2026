import AppIntents
import Foundation

// Brief 66 — Expo / iOS App Intents (Gentler 5.13).
// Shortcuts-friendly exposure. Live spoken replies are computed in JS
// glance adapters from Hannah SSOT. Native dialogs are fail-closed:
// UNKNOWN / Coming soon only. Never invent a score, band, molecule,
// dose, CTA, or last-sync timestamp. Never store PHI on device.
// The native health bridge stays off.

@available(iOS 16.0, *)
struct GetBioOptimizationScoreIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Bio Optimization Score"
    static var description = IntentDescription(
        "Hear your Bio Optimization Score. Missing pieces stay out, not counted as zero."
    )
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult & ProvidesDialog {
        .result(
            dialog: IntentDialog(
                "Your Bio Optimization Score isn't ready yet. Missing pieces stay out, not counted as zero."
            )
        )
    }
}

@available(iOS 16.0, *)
struct GetTodaysProtocolNextIntent: AppIntent {
    static var title: LocalizedStringResource = "Get today's protocol next"
    static var description = IntentDescription(
        "Hear the next item on today's protocol. Never invents a molecule or dose."
    )
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        .result()
    }
}

@available(iOS 16.0, *)
struct GetWearableLastSyncIntent: AppIntent {
    static var title: LocalizedStringResource = "Get wearable last-sync"
    static var description = IntentDescription(
        "Hear wearable last-sync. Whoop, Oura, Google Health, and Garmin are coming soon."
    )
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Source")
    var source: String?

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let asked = (source ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if asked.contains("whoop") {
            return .result(dialog: IntentDialog("Whoop is coming soon."))
        }
        if asked.contains("oura") {
            return .result(dialog: IntentDialog("Oura is coming soon."))
        }
        if asked.contains("google") {
            return .result(dialog: IntentDialog("Google Health is coming soon."))
        }
        if asked.contains("garmin") {
            return .result(dialog: IntentDialog("Garmin is coming soon."))
        }
        .result()
    }
}

@available(iOS 16.0, *)
struct ViaConnectAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: GetBioOptimizationScoreIntent(),
            phrases: [
                "What's my Bio Optimization Score in \(.applicationName)",
                "How's my ViaConnect score today in \(.applicationName)",
                "Am I ready to push or ease up in \(.applicationName)",
            ],
            shortTitle: "Bio Optimization Score",
            systemImageName: "heart.text.square"
        )
        AppShortcut(
            intent: GetTodaysProtocolNextIntent(),
            phrases: [
                "What's next on my protocol in \(.applicationName)",
                "What should I do next in \(.applicationName)",
            ],
            shortTitle: "Today's protocol next",
            systemImageName: "list.bullet"
        )
        AppShortcut(
            intent: GetWearableLastSyncIntent(),
            phrases: [
                "When did my wearables last sync in \(.applicationName)",
                "Is Apple Health connected in \(.applicationName)",
                "Is Hume connected in \(.applicationName)",
            ],
            shortTitle: "Wearable last-sync",
            systemImageName: "applewatch"
        )
    }
}
