# Task Manager iOS

This is a native iOS wrapper for the existing Task Manager web app.

## Build On Mac

1. Open `ios/TaskManager/TaskManager.xcodeproj` in Xcode.
2. Select the `TaskManager` target.
3. Set your Apple team under **Signing & Capabilities**.
4. Connect your iPhone.
5. Choose your iPhone as the run destination.
6. Press **Run**.

The app currently loads the local development server at `http://192.168.1.165:3000/`. Keep `npm start` running on the Mac and keep the iPhone on the same Wi-Fi network.

To point it at a deployed server, edit `TaskManager/AppConfig.swift` and use an HTTPS URL such as `https://small-pr.vercel.app/`.

For a physical iPhone, never use `localhost` for the web URL. `localhost` means the phone itself, not your Mac.

## Command Line Build

After installing full Xcode, run:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -project ios/TaskManager/TaskManager.xcodeproj -scheme TaskManager -configuration Debug -destination 'generic/platform=iOS' build
```

## Notes

- This project must be compiled with Xcode on macOS. Windows can create the source files, but Apple only supports iOS signing and device builds from Xcode.
- If the web app changes, deploy the server first, then rebuild or relaunch this wrapper app.
