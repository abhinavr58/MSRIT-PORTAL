# MSRIT Attendance App (Android & iOS)

Built with **Expo SDK 52 / React Native 0.76** (supports the latest Android 15+ and iOS 18+ versions).

## How to Get Your Downloadable APK / IPA via GitHub (No PC Setup Needed)

1. Unzip `MSRIT-Attendance-App.zip`.
2. Create a new repository on [GitHub](https://github.com/new) (make it **Public** for unlimited free GitHub Actions minutes).
3. Click **uploading an existing file** and drag all the unzipped files (including the `.github` folder) into the repo, then click **Commit changes**.
4. Open the **Actions** tab in your GitHub repo:
   - **Build Android APK** runs automatically and produces `MSRIT-Attendance-Android-APK` (`app-debug.apk`) under **Artifacts**—download it and share it with any classmate!
   - **Build iOS App (IPA)** also runs on macOS and produces `MSRIT-Attendance-iOS-IPA` (`MSRIT-Attendance-iOS-Unsigned.ipa`), which can be sideloaded onto iPhones via AltStore/Sideloadly (or signed via `eas build -p ios`).
