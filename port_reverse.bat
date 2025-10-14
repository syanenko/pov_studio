adb devices
REM adb logcat
REM adb logcat chromium:D WebView:D *:S
REM adb logcat browser:V *:S
adb reverse tcp:443 tcp:443
REM adb reverse tcp:8085 tcp:8085
REM adb logcat *:V | grep QQ


