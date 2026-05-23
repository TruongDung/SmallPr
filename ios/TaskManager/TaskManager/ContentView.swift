import SwiftUI

struct ContentView: View {
    @State private var isLoading = true
    @State private var errorMessage: String?

    var body: some View {
        ZStack {
            WebView(
                url: AppConfig.taskManagerURL,
                isLoading: $isLoading,
                errorMessage: $errorMessage
            )
            .ignoresSafeArea(.keyboard, edges: .bottom)

            if isLoading {
                ProgressView()
                    .controlSize(.large)
                    .padding(24)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            }

            if let errorMessage {
                VStack(spacing: 12) {
                    Text("Task Manager")
                        .font(.headline)
                    Text(errorMessage)
                        .font(.subheadline)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                }
                .padding(24)
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                .padding()
            }
        }
    }
}
