import Foundation

enum AppConfig {
    // Production: load the deployed Task Manager URL.
    // For local iPhone testing on the same Wi-Fi, switch this back to your
    // Mac's local IP (e.g. http://192.168.1.165:3000/).
    static let taskManagerURL = URL(string: "https://small-pr.vercel.app/")!
}
