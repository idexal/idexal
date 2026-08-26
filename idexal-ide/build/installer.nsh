; Idexal IDE Professional NSIS Installer
; Simplified - electron-builder handles sections and size calculation

; ============================================
; CUSTOM HEADER - Runs before anything else
; ============================================
!macro customHeader
  BrandingText "Idexal IDE v${VERSION}"
!macroend

; ============================================
; PRE-INIT - Before installer initializes
; ============================================
!macro preInit
!macroend

; ============================================
; CUSTOM INIT - After .init function
; ============================================
!macro customInit
  ; Check for previous installation and offer upgrade
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_FILENAME}" "UninstallString"
  StrCmp $0 "" showWelcome

  MessageBox MB_YESNO|MB_ICONQUESTION \
    "A previous version of Idexal IDE was detected.$\r$\n$\r$\nWould you like to upgrade? (Recommended)" \
    IDYES upgradeInstall IDNO showWelcome

  upgradeInstall:
    DetailPrint "Upgrading Idexal IDE..."
    Goto showWelcome

  showWelcome:
!macroend

; ============================================
; CUSTOM UN-INIT - Before uninstaller initializes
; ============================================
!macro customUnInit
  ; Check if app is running
  nsExec::ExecToLog 'tasklist /FI "IMAGENAME eq idexal-ide.exe" /NH'
  Pop $0
  ${If} $0 == "0"
    MessageBox MB_YESNO|MB_ICONEXCLAMATION \
      "Idexal IDE is currently running.$\r$\n$\r$\nDo you want to close it and continue uninstalling?" \
      IDYES closeApp IDNO cancelUninstall

    closeApp:
      nsExec::ExecToLog 'taskkill /F /IM idexal-ide.exe'
      Sleep 1000
      Goto done

    cancelUninstall:
      Abort

    done:
  ${EndIf}
!macroend

; ============================================
; CUSTOM PAGE - Before install directory page
; ============================================
!macro customPageDe
!macroend

; ============================================
; CUSTOM PAGE - During installation
; ============================================
!macro customPageInstFiles
  DetailPrint "Installing Idexal IDE..."
!macroend

; ============================================
; CUSTOM PAGE - Finish page
; ============================================
!macro customPageFinish
!macroend

; ============================================
; CUSTOM UN-FILES - During uninstallation
; ============================================
!macro customUnFiles
  ; Clean up optional files
  RMDir /r "$INSTDIR\cache"
  RMDir /r "$INSTDIR\logs"
  RMDir /r "$INSTDIR\temp"
!macroend