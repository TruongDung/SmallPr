# Task Manager iOS

This is a native iOS wrapper for the existing Task Manager web app.

## Build On Mac

1. Open `ios/TaskManager/TaskManager.xcodeproj` in Xcode.
2. Select the `TaskManager` target.
3. Set your Apple team under **Signing & Capabilities**.
4. Connect your iPhone.
5. Choose your iPhone as the run destination.
6. Press **Run**.

The app loads `https://small-pr.vercel.app/` by default. To point it at a different deployed server, edit `TaskManager/AppConfig.swift`.

For a physical iPhone, use an HTTPS URL that the phone can reach. `localhost` means the phone itself, not this Windows computer.

## Notes

- This project must be compiled with Xcode on macOS. Windows can create the source files, but Apple only supports iOS signing and device builds from Xcode.
- If the web app changes, deploy the server first, then rebuild or relaunch this wrapper app.
