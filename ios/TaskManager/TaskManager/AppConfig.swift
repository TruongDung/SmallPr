import Foundation

enum AppConfig {
    // Use the Mac's local network IP for iPhone testing. Switch this back to the
    // deployed HTTPS URL before shipping outside your local network.
    static let taskManagerURL = URL(string: "http://192.168.1.165:3000/")!
}
