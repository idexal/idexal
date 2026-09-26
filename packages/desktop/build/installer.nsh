!include nsDialogs.nsh
; ── 向导自定义文案的多语言表 ──────────────────────────────────────────────
; 应用界面语言是阿拉伯语/英语/法语，向导里我们自己写的提示必须跟随同一套语言，
; 否则英文用户会在一个只有报错是中文的安装流程里被卡住。
!define IDEXAL_LANG_EN 1033
!define IDEXAL_LANG_FR 1036
!define IDEXAL_LANG_AR 1025

LangString IdexalBlockTitle ${IDEXAL_LANG_EN} "Choose a different installation folder"
LangString IdexalBlockTitle ${IDEXAL_LANG_FR} "Choisissez un autre dossier d'installation"
LangString IdexalBlockTitle ${IDEXAL_LANG_AR} "اختر مجلد تثبيت مختلفًا"

LangString IdexalBlockSubtitle ${IDEXAL_LANG_EN} "This folder or one of its subfolders contains an Idexal data folder"
LangString IdexalBlockSubtitle ${IDEXAL_LANG_FR} "Ce dossier ou l'un de ses sous-dossiers contient un dossier de données Idexal"
LangString IdexalBlockSubtitle ${IDEXAL_LANG_AR} "يحتوي هذا المجلد أو أحد مجلداته الفرعية على مجلد بيانات Idexal"

LangString IdexalDataFound ${IDEXAL_LANG_EN} "An Idexal data folder (.idexal) was found in this location:"
LangString IdexalDataFound ${IDEXAL_LANG_FR} "Un dossier de données Idexal (.idexal) a été trouvé ici :"
LangString IdexalDataFound ${IDEXAL_LANG_AR} "تم العثور على مجلد بيانات Idexal (‏.idexal‏) في هذا الموقع:"

LangString IdexalDataFoundHint ${IDEXAL_LANG_EN} "To keep your past sessions and settings from being removed by the installer, go back and pick another folder.$$
$$
This folder cannot be used."
LangString IdexalDataFoundHint ${IDEXAL_LANG_FR} "Pour éviter que l'installateur supprime vos sessions et réglages, revenez en arrière et choisissez un autre dossier.$$
$$
Ce dossier ne peut pas être utilisé."
LangString IdexalDataFoundHint ${IDEXAL_LANG_AR} "حتى لا يحذف المثبّت جلساتك وإعداداتك السابقة، ارجع إلى الخطوة السابقة واختر مجلدًا آخر.$$
$$
لا يمكن استخدام هذا المجلد."

LangString IdexalPickAnother ${IDEXAL_LANG_EN} "Pick another folder"
LangString IdexalPickAnother ${IDEXAL_LANG_FR} "Choisir un autre dossier"
LangString IdexalPickAnother ${IDEXAL_LANG_AR} "اختر مجلدًا آخر"

LangString IdexalBlockedTitle ${IDEXAL_LANG_EN} "Idexal data folder detected"
LangString IdexalBlockedTitle ${IDEXAL_LANG_FR} "Dossier de données Idexal détecté"
LangString IdexalBlockedTitle ${IDEXAL_LANG_AR} "تم العثور على مجلد بيانات Idexal"

LangString IdexalBlockedBody ${IDEXAL_LANG_EN} "An Idexal data folder (.idexal) exists in this location, so installation has stopped.$$
Please run the installer again and choose a different folder."
LangString IdexalBlockedBody ${IDEXAL_LANG_FR} "Un dossier de données Idexal (.idexal) existe ici, l'installation est donc arrêtée.$$
Veuillez relancer l'installateur et choisir un autre dossier."
LangString IdexalBlockedBody ${IDEXAL_LANG_AR} "يوجد مجلد بيانات Idexal في هذا الموقع، لذلك تم إيقاف التثبيت.$$
الرجاء إعادة تشغيل المثبّت واختيار مجلد مختلف."

LangString IdexalDeleteOldFileFailed ${IDEXAL_LANG_EN} "Could not delete an old version file:"
LangString IdexalDeleteOldFileFailed ${IDEXAL_LANG_FR} "Impossible de supprimer un fichier de la version précédente :"
LangString IdexalDeleteOldFileFailed ${IDEXAL_LANG_AR} "تعذّر حذف ملف من الإصدار السابق:"

LangString IdexalCleanupFailedTitle ${IDEXAL_LANG_EN} "Could not remove the previous version"
LangString IdexalCleanupFailedTitle ${IDEXAL_LANG_FR} "Impossible de supprimer la version précédente"
LangString IdexalCleanupFailedTitle ${IDEXAL_LANG_AR} "تعذّر إزالة الإصدار السابق"

LangString IdexalCleanupFailedBody ${IDEXAL_LANG_EN} "Error code: $R0$$
This is usually a file in use, insufficient permissions, or not enough disk space.$$
Detailed log: ${IDEXAL_UNINSTALLER_LOG_PATH}"
LangString IdexalCleanupFailedBody ${IDEXAL_LANG_FR} "Code d'erreur : $R0$$
Il s'agit le plus souvent d'un fichier utilisé, d'autorisations insuffisantes ou d'un manque d'espace disque.$$
Journal détaillé : ${IDEXAL_UNINSTALLER_LOG_PATH}"
LangString IdexalCleanupFailedBody ${IDEXAL_LANG_AR} "رمز الخطأ: $R0$$
السبب عادة ملف قيد الاستخدام أو صلاحيات غير كافية أو عدم كفاية مساحة القرص.$$
السجل التفصيلي: ${IDEXAL_UNINSTALLER_LOG_PATH}"

!include FileFunc.nsh

!ifndef IDEXAL_INSTALLER_DEFAULT_LOG_PATH
  !define IDEXAL_INSTALLER_DEFAULT_LOG_PATH "$TEMP\Idexal-installer.log"
!endif
!ifndef IDEXAL_INSTALLER_ELEVATED_LOG_PATH
  !define IDEXAL_INSTALLER_ELEVATED_LOG_PATH "$WINDIR\Logs\Idexal-installer.log"
!endif
!ifndef IDEXAL_INSTALLER_IS_ELEVATED_INNER
  ; 来源只在测试夹具模拟内层，正式默认恒假会让提权进程继续使用调用方 /LOG。
  ; 使用 electron-builder 同一 UAC 判据；隔离夹具仍可显式替换，不改变真正的提权流程。
  !include UAC.nsh
  !define IDEXAL_INSTALLER_IS_ELEVATED_INNER `${UAC_IsInnerInstance}`
!endif

!ifndef IDEXAL_INSTALL_MANIFEST_NAME
  !define IDEXAL_INSTALL_MANIFEST_NAME ".idexal-install-manifest"
!endif

!ifndef IDEXAL_UNINSTALLER_LOG_PATH
  !define IDEXAL_UNINSTALLER_LOG_PATH "$TEMP\Idexal-uninstaller.log"
!endif
!ifndef IDEXAL_UNINSTALLER_FUNCTION_PREFIX
  !define IDEXAL_UNINSTALLER_FUNCTION_PREFIX "un."
!endif

!ifdef BUILD_UNINSTALLER
  Var IdexalUninstallerLogUnavailable

  ; 卸载器只在更新时删除旧文件；单独记录清理阶段，避免外层把权限/空间错误误报成应用仍在运行。
  !macro IdexalReportUninstallerStage MESSAGE
    DetailPrint "Idexal: ${MESSAGE}"
    Push "${MESSAGE}"
    Call ${IDEXAL_UNINSTALLER_FUNCTION_PREFIX}IdexalWriteUninstallerLog
  !macroend

  Function ${IDEXAL_UNINSTALLER_FUNCTION_PREFIX}IdexalWriteUninstallerLog
    Exch $R9
    Push $R0
    Push $R1
    Push $R2

    StrCmp $IdexalUninstallerLogUnavailable "1" idexalUninstallerLogDone
    ClearErrors
    FileOpen $R1 "${IDEXAL_UNINSTALLER_LOG_PATH}" a
    IfErrors idexalUninstallerLogFailed idexalUninstallerLogWrite
    idexalUninstallerLogWrite:
      System::Call "kernel32::GetCurrentProcessId() i.R0"
      FileSeek $R1 0 END
      FileWrite $R1 "[pid=$R0] $R9$\r$\n"
      FileClose $R1
      Goto idexalUninstallerLogDone
    idexalUninstallerLogFailed:
      ; 日志不可写不应改变卸载结果，保留原始清理错误供外层处理。
      StrCpy $IdexalUninstallerLogUnavailable "1"
      ClearErrors
    idexalUninstallerLogDone:
      Pop $R2
      Pop $R1
      Pop $R0
      Pop $R9
  FunctionEnd

  !macro customRemoveFilesDiagnosticsStart
    !insertmacro IdexalReportUninstallerStage "cleanup-started"
  !macroend

  !macro customRemoveFilesDiagnosticsComplete
    !insertmacro IdexalReportUninstallerStage "cleanup-completed"
  !macroend
!endif

!macro customRemoveFiles
  ; electron-builder 默认在更新时递归删除整个 $INSTDIR，用户放入的无关文件也会被清掉。
  ; 只按上一版本随包生成的所有权清单删除，清单缺失时迁移旧版本采用 fail-open 保留策略。
  ${if} ${isUpdated}
    !ifdef BUILD_UNINSTALLER
      !insertmacro customRemoveFilesDiagnosticsStart
    !endif
    ClearErrors
    FileOpen $R0 "$INSTDIR\${IDEXAL_INSTALL_MANIFEST_NAME}" r
    IfErrors idexalManifestMissing

    idexalManifestRead:
      ClearErrors
      FileRead $R0 $R1
      IfErrors idexalManifestClose
      ; NSIS FileRead 保留行尾 CRLF；打包清单统一使用换行结尾，先去掉两个行尾字符。
      StrCpy $R1 $R1 -2
      StrCmp $R1 "" idexalManifestRead

      ; 拒绝绝对路径和 .. 前缀，避免损坏或篡改清单越界删除。
      StrCpy $R2 $R1 1
      StrCmp $R2 "\\" idexalManifestRead
      StrCmp $R2 "/" idexalManifestRead
      StrCpy $R2 $R1 2
      StrCmp $R2 ".." idexalManifestRead
      StrCmp $R1 "${UNINSTALL_FILENAME}" idexalManifestRead
      GetFullPathName $R2 "$INSTDIR\$R1"
      StrCmp $R2 "$INSTDIR\$R1" 0 idexalManifestRead

      ; 当前版本卸载器与外层安装器是两个进程；逐项记录到卸载器日志，便于核对真正尝试删除的文件。
      !ifdef BUILD_UNINSTALLER
        !insertmacro IdexalReportUninstallerStage "cleanup-file path=$R1"
      !endif
      ClearErrors
      Delete "$INSTDIR\$R1"
      IfErrors idexalManifestDeleteFailed
      Goto idexalManifestRead

    idexalManifestDeleteFailed:
      FileClose $R0
      !ifdef BUILD_UNINSTALLER
        !insertmacro IdexalReportUninstallerStage "cleanup-failed reason=permission-or-disk-space"
      !endif
      Abort "$(IdexalDeleteOldFileFailed) $INSTDIR\$R1"

    idexalManifestClose:
      FileClose $R0
      Goto idexalManifestDone

    idexalManifestMissing:
      ; 首次从旧版本升级时没有清单，不能猜测所有权并删除用户文件。
      !ifdef BUILD_UNINSTALLER
        !insertmacro IdexalReportUninstallerStage "cleanup-skipped reason=manifest-missing action=preserve"
      !endif
      ClearErrors

    idexalManifestDone:
      !ifdef BUILD_UNINSTALLER
        !insertmacro customRemoveFilesDiagnosticsComplete
      !endif
  ${else}
    ; 普通卸载仍保持 electron-builder 的全量删除语义；ownership 清单只约束覆盖更新。
    SetOutPath $TEMP
    RMDir /r $INSTDIR
  ${endIf}
!macroend

!ifndef BUILD_UNINSTALLER
  Var IdexalInstallerLogPath
  Var IdexalInstallerLogUnavailable
  Var IdexalInstallerProcessRole
  Var IdexalUninstallerDetailsUnavailable
  Var IdexalPreviousUninstallerSupportsManifest

  ; 详情面板和文件日志共用同一条阶段事件，避免静默安装丢失关键上下文。
  !macro IdexalReportInstallerStage MESSAGE
    SetDetailsPrint listonly
    DetailPrint "Idexal: ${MESSAGE}"
    Push "${MESSAGE}"
    Call IdexalWriteInstallerLog
  !macroend

  Function IdexalWriteInstallerLog
    Exch $R9
    Push $R0
    Push $R1
    Push $R2

    StrCmp $IdexalInstallerLogPath "" idexalInstallerLogDone
    StrCmp $IdexalInstallerLogUnavailable "1" idexalInstallerLogDone
    StrCpy $R2 0
    idexalInstallerLogOpen:
      ClearErrors
      FileOpen $R1 $IdexalInstallerLogPath a
      IfErrors idexalInstallerLogRetry idexalInstallerLogWrite
    idexalInstallerLogRetry:
      IntOp $R2 $R2 + 1
      IntCmp $R2 3 idexalInstallerLogFailed idexalInstallerLogWait idexalInstallerLogFailed
    idexalInstallerLogWait:
      Sleep 50
      Goto idexalInstallerLogOpen
    idexalInstallerLogWrite:
      System::Call "kernel32::GetCurrentProcessId() i.R0"
      FileSeek $R1 0 END
      FileWrite $R1 "[pid=$R0] $R9$\r$\n"
      FileClose $R1
      Goto idexalInstallerLogDone
    idexalInstallerLogFailed:
      StrCpy $IdexalInstallerLogUnavailable "1"
      ClearErrors
    idexalInstallerLogDone:
      Pop $R2
      Pop $R1
      Pop $R0
      Pop $R9
  FunctionEnd

  Function IdexalResetUninstallerLog
    StrCpy $IdexalUninstallerDetailsUnavailable ""
    ClearErrors
    FileOpen $R0 "${IDEXAL_UNINSTALLER_LOG_PATH}" w
    IfErrors idexalUninstallerDetailsResetFailed idexalUninstallerDetailsResetSucceeded
    idexalUninstallerDetailsResetSucceeded:
      FileClose $R0
      Goto idexalUninstallerDetailsResetDone
    idexalUninstallerDetailsResetFailed:
      ; 外层详情不能读取旧卸载器日志时仍继续安装，文件日志和退出码仍是最终依据。
      StrCpy $IdexalUninstallerDetailsUnavailable "1"
      ClearErrors
    idexalUninstallerDetailsResetDone:
  FunctionEnd

  Function IdexalShowUninstallerCleanupDetails
    Push $R0
    Push $R1
    Push $R2

    StrCmp $IdexalUninstallerDetailsUnavailable "1" idexalShowUninstallerDetailsDone
    ClearErrors
    FileOpen $R0 "${IDEXAL_UNINSTALLER_LOG_PATH}" r
    IfErrors idexalShowUninstallerDetailsDone
    idexalShowUninstallerDetailsRead:
      ClearErrors
      FileRead $R0 $R1
      IfErrors idexalShowUninstallerDetailsClose
      StrCmp $R1 "" idexalShowUninstallerDetailsRead
      SetDetailsPrint listonly
      DetailPrint "Idexal: cleanup-log $R1"
      Goto idexalShowUninstallerDetailsRead
    idexalShowUninstallerDetailsClose:
      FileClose $R0
    idexalShowUninstallerDetailsDone:
      Pop $R2
      Pop $R1
      Pop $R0
  FunctionEnd

  !macro preInit
    Call IdexalInitializeInstallerLog
  !macroend

  !macro customInit
    IfSilent idexalInstallerInitSilent idexalInstallerInitInteractive
    idexalInstallerInitSilent:
      !insertmacro IdexalReportInstallerStage "installer-initialized mode=silent"
      Goto idexalInstallerInitDone
    idexalInstallerInitInteractive:
      !insertmacro IdexalReportInstallerStage "installer-initialized mode=interactive"
    idexalInstallerInitDone:
  !macroend

  ; 这些宏由打包时的 electron-builder installSection.nsh 补丁按安装顺序调用。
  ; 只有阶段 marker 写入详情和日志，解压文件明细由 NSIS 的 File 命令在 listonly 模式输出。
  !macro customInstallSectionStarted
    !insertmacro IdexalReportInstallerStage "install-started"
  !macroend

  !macro customInstallCleanupStarted
    Call IdexalResetUninstallerLog
    !insertmacro IdexalReportInstallerStage "cleanup-started"
  !macroend

  !macro customInstallCleanupCompleted
    !insertmacro IdexalReportInstallerStage "cleanup-completed"
    Call IdexalShowUninstallerCleanupDetails
  !macroend

  !macro customInstallExtractStarted
    !insertmacro IdexalReportInstallerStage "extract-started"
  !macroend

  !macro customInstallExtractCompleted
    !insertmacro IdexalReportInstallerStage "extract-completed"
  !macroend

  !macro customInstallShortcutsStarted
    !insertmacro IdexalReportInstallerStage "shortcuts-started"
  !macroend

  !macro customInstallShortcutsCompleted
    !insertmacro IdexalReportInstallerStage "shortcuts-completed"
  !macroend

  Function IdexalDetectPreviousUninstallerCapabilities
    StrCpy $IdexalPreviousUninstallerSupportsManifest "0"
    ; manifest 是卸载器能力标记：存在即表示旧卸载器会按清单选择性删除。
    IfFileExists "$INSTDIR\${IDEXAL_INSTALL_MANIFEST_NAME}" 0 idexalPreviousUninstallerCapabilityCheckNested
      StrCpy $IdexalPreviousUninstallerSupportsManifest "1"
      Return

    idexalPreviousUninstallerCapabilityCheckNested:
      ; assisted installer 的目录页会在后续 instfilesPre 才补上 APP_FILENAME 子目录，提前兼容两种形态。
      IfFileExists "$INSTDIR\${APP_FILENAME}\${IDEXAL_INSTALL_MANIFEST_NAME}" 0 idexalPreviousUninstallerCapabilityDone
        StrCpy $IdexalPreviousUninstallerSupportsManifest "1"

    idexalPreviousUninstallerCapabilityDone:
  FunctionEnd

  !macro customUnInstallCheck
    ; handleUninstallResult 会把旧卸载器的退出码放在 $R0；失败时显示清理诊断，
    ; 不再复用 appCannotBeClosed（该文案只适用于进程占用）。
    ${if} $R0 != 0
      ; 静默自动更新无人值守，未设置 /SD 的模态框会一直等待用户点击，
      ; 使明确的退出码无法返回 electron-updater。静默时自动采用 IDOK，交互时仍显示提示。
      SetDetailsPrint listonly
      DetailPrint "Idexal: cleanup-failed exit-code=$R0"
      Call IdexalShowUninstallerCleanupDetails
      MessageBox MB_OK|MB_ICONSTOP "$(IdexalCleanupFailedTitle)$\r$\n$(IdexalCleanupFailedBody)" /SD IDOK
      SetErrorLevel 2
      Quit
    ${endif}
  !macroend

  !macro customUnInstallCheckCurrentUser
    ; per-machine 安装切换到 HKCU 旧版本时，electron-builder 会走另一条 hook；
    ; 复用同一诊断，避免同一个清理失败因注册表根键不同又退回默认文案。
    !insertmacro customUnInstallCheck
  !macroend
!endif

!define IDEXAL_INSTALL_DIR_BACK_BUTTON_WIDTH 180

!macro customHeader
  !ifndef BUILD_UNINSTALLER
    ; 异步生成的 header 可能先 include 本文件，再注册 UAC 插件目录。
    ; 在 customHeader 展开函数，确保插件已注册；preInit 仍调用同一函数和真实 UAC 判据。
    Function IdexalInitializeInstallerLog
      Push $R0
      Push $R1
      Push $R2
      StrCpy $IdexalInstallerLogUnavailable ""
      ${If} ${IDEXAL_INSTALLER_IS_ELEVATED_INNER}
        StrCpy $IdexalInstallerProcessRole "elevated-inner"
        StrCpy $IdexalInstallerLogPath "${IDEXAL_INSTALLER_ELEVATED_LOG_PATH}"
      ${Else}
        StrCpy $IdexalInstallerProcessRole "outer"
        StrCpy $R0 $CMDLINE
        ClearErrors
        ${GetOptions} $R0 "/LOG=" $R1
        IfErrors idexalInstallerLogUseDefault
        StrCmp $R1 "" idexalInstallerLogUseDefault
        StrCpy $IdexalInstallerLogPath $R1
        Goto idexalInstallerLogPathReady
        idexalInstallerLogUseDefault:
          StrCpy $IdexalInstallerLogPath "${IDEXAL_INSTALLER_DEFAULT_LOG_PATH}"
        idexalInstallerLogPathReady:
          ${GetParent} $IdexalInstallerLogPath $R2
          StrCmp $R2 "" idexalInstallerLogInitialized
          CreateDirectory "$R2"
      ${EndIf}
      idexalInstallerLogInitialized:
        !insertmacro IdexalReportInstallerStage "installer-process-started role=$IdexalInstallerProcessRole"
      Pop $R2
      Pop $R1
      Pop $R0
    FunctionEnd

    ; electron-builder 的 common.nsh 先设置 ShowInstDetails nevershow；
    ; hide 在该模板组合下仍可能留下空白列表且没有可展开入口，因此直接常显阶段详情。
    ShowInstDetails show
    !ifdef allowToChangeInstallationDirectory
      ; electron-builder 已在 assistedInstaller.nsh 中用该开关生成安装目录页面，
      ; 但 installUtil.nsh 随后还会用它禁止无 --updated 的手动覆盖保留快捷方式，导致旧卸载器
      ; 调用 UninstShortcut 注销开始菜单固定项。页面生成后撤掉开关，让自动更新和手动覆盖
      ; 在同一安装目录覆盖时都通过 KeepShortcuts 保留同一个 .lnk。
      !undef allowToChangeInstallationDirectory
    !endif
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
  ; electron-builder 会先编译卸载器，但快捷方式目标读取只在安装更新流程中调用。
  ; 若把函数带入卸载器，NSIS 会产生 6010 未引用告警，并在 /WX 下直接中断 Windows CI。
  Function IdexalReadShortcutTarget
    Exch $R9
    Push $R1
    Push $R2

    StrCpy $R2 ""
    System::Call 'Kernel32::SetEnvironmentVariableW(w "IDEXAL_SHORTCUT_PATH", w "$R9") i.R1'
    StrCmp $R1 "0" idexalReadShortcutTargetDone 0

    nsExec::ExecToStack /TIMEOUT=5000 `"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -Command "[Console]::Out.Write(([Activator]::CreateInstance([type]::GetTypeFromProgID('WScript.Shell'))).CreateShortcut([Environment]::GetEnvironmentVariable('IDEXAL_SHORTCUT_PATH')).TargetPath)"`
    Pop $R1
    Pop $R2
    StrCmp $R1 "0" idexalReadShortcutTargetDone 0
    StrCpy $R2 ""

    idexalReadShortcutTargetDone:
      System::Call 'Kernel32::SetEnvironmentVariableW(w "IDEXAL_SHORTCUT_PATH", p 0) i.R1'
      StrCpy $R9 "$R2"
      Pop $R2
      Pop $R1
      Exch $R9
  FunctionEnd
!endif

!macro IdexalRepairShortcutIfNeeded SHORTCUT_PATH LABEL_PREFIX
  ${if} ${FileExists} "${SHORTCUT_PATH}"
    Push "${SHORTCUT_PATH}"
    Call IdexalReadShortcutTarget
    Pop $R0
    StrCmp $R0 "$appExe" ${LABEL_PREFIX}Done 0

    ; 历史版本可能留下指向已移动 exe 的 .lnk，但无条件覆盖正确快捷方式会让
    ; 部分 Windows 11 丢失“所有应用”索引或用户固定关系，因此只修复目标不一致的项。
    ClearErrors
    CreateShortCut "${SHORTCUT_PATH}" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
    IfErrors ${LABEL_PREFIX}Failed ${LABEL_PREFIX}Succeeded
    ${LABEL_PREFIX}Failed:
      DetailPrint "Unable to repair shortcut: ${SHORTCUT_PATH}"
      ClearErrors
      Goto ${LABEL_PREFIX}Done
    ${LABEL_PREFIX}Succeeded:
      WinShell::SetLnkAUMI "${SHORTCUT_PATH}" "${APP_ID}"
      ; 重写后的 .lnk 必须在最后一次写入后通知 Shell，避免开始菜单继续使用旧索引。
      System::Call 'Shell32::SHChangeNotify(i 0x00002000, i 0x0005, w "${SHORTCUT_PATH}", p 0)'
    ${LABEL_PREFIX}Done:
  ${endIf}
!macroend

!macro customInstall
  !ifndef BUILD_UNINSTALLER
    !insertmacro IdexalReportInstallerStage "install-finalization-started"
  !endif
  ${if} ${isUpdated}
  ${orIf} $keepShortcuts == "true"
    !ifndef DO_NOT_CREATE_START_MENU_SHORTCUT
      !insertmacro IdexalRepairShortcutIfNeeded "$newStartMenuLink" idexalStartMenuShortcutRepair
    !endif

    !ifndef DO_NOT_CREATE_DESKTOP_SHORTCUT
      !insertmacro IdexalRepairShortcutIfNeeded "$newDesktopLink" idexalDesktopShortcutRepair
    !endif
  ${endIf}

  ; 手动覆盖没有 --updated，继承旧快捷方式时仍需检查目标；首次安装没有旧项，
  ; 不应额外启动 PowerShell。用户已删除的快捷方式也不会重建。
  ; assisted installer 完成页始终直接运行本次安装落盘的 exe。
  StrCpy $launchLink "$appExe"
  !ifndef BUILD_UNINSTALLER
    !insertmacro IdexalReportInstallerStage "install-completed"
  !endif
!macroend

!macro customPageAfterChangeDir
  Function IdexalResizeInstallDirBackButton
    GetDlgItem $1 $HWNDPARENT 3
    StrCmp $1 0 idexalResizeInstallDirBackButtonDone 0

    System::Call "*(i 0, i 0, i 0, i 0) p.r2"
    StrCmp $2 0 idexalResizeInstallDirBackButtonDone 0
    System::Call "user32::GetWindowRect(p r1, p r2)"
    System::Call "user32::MapWindowPoints(p 0, p $HWNDPARENT, p r2, i 2)"
    System::Call "*$2(i.r3,i.r4,i.r5,i.r6)"
    System::Free $2

    IntOp $7 $5 - $3
    IntOp $8 $6 - $4
    IntCmp $7 ${IDEXAL_INSTALL_DIR_BACK_BUTTON_WIDTH} idexalResizeInstallDirBackButtonDone idexalResizeInstallDirBackButtonResize idexalResizeInstallDirBackButtonDone

    idexalResizeInstallDirBackButtonResize:
      ; 阻断页把“上一步”改成中文动作文案，NSIS 默认按钮宽度可能裁掉文字。
      ; 保持右边缘不动向左扩宽，避免和右侧“安装/取消”按钮重叠。
      IntOp $3 $5 - ${IDEXAL_INSTALL_DIR_BACK_BUTTON_WIDTH}
      System::Call "user32::MoveWindow(p r1, i r3, i r4, i ${IDEXAL_INSTALL_DIR_BACK_BUTTON_WIDTH}, i r8, i 1)"

    idexalResizeInstallDirBackButtonDone:
  FunctionEnd

  Function IdexalFindNestedDataDir
    Exch $R9
    Push $0
    Push $1

    StrCpy $R2 ""

    IfFileExists "$R9\.idexal\*.*" 0 +2
      StrCpy $R2 "$R9\.idexal"
    StrCmp $R2 "" 0 idexalFindNestedDataDirDone
    IfFileExists "$R9\.idexal" 0 idexalFindNestedDataDirListChildren
      StrCpy $R2 "$R9\.idexal"
    StrCmp $R2 "" 0 idexalFindNestedDataDirDone

    idexalFindNestedDataDirListChildren:
      FindFirst $0 $1 "$R9\*"
      IfErrors idexalFindNestedDataDirDone

    idexalFindNestedDataDirNext:
      StrCmp $1 "" idexalFindNestedDataDirClose
      StrCmp $1 "." idexalFindNestedDataDirContinue
      StrCmp $1 ".." idexalFindNestedDataDirContinue
      IfFileExists "$R9\$1\*.*" 0 idexalFindNestedDataDirContinue
        Push "$R9\$1"
        Call IdexalFindNestedDataDir
        StrCmp $R2 "" idexalFindNestedDataDirContinue idexalFindNestedDataDirClose

    idexalFindNestedDataDirContinue:
      FindNext $0 $1
      IfErrors idexalFindNestedDataDirClose
      Goto idexalFindNestedDataDirNext

    idexalFindNestedDataDirClose:
      FindClose $0

    idexalFindNestedDataDirDone:
      Pop $1
      Pop $0
      Pop $R9
  FunctionEnd

  Function IdexalBlockInstallDirContainsData
    Call IdexalDetectPreviousUninstallerCapabilities
    StrCmp $IdexalPreviousUninstallerSupportsManifest "1" idexalInstallDirDataBlockSkip

    ;  用户可能把数据存储目录放进安装目录，Windows 更新覆盖安装目录时会清掉 .idexal。
    ; assisted installer 会把不含应用名的选择目录补成 "$INSTDIR\${APP_FILENAME}"，所以这里按相同规则计算最终安装目录。
    ${StrContains} $R1 "${APP_FILENAME}" "$INSTDIR"
    StrCmp $R1 "" 0 idexalInstallDirDataBlockUseSelectedDir
    StrCpy $R0 "$INSTDIR\${APP_FILENAME}"
    Goto idexalInstallDirDataBlockCheckDir

    idexalInstallDirDataBlockUseSelectedDir:
      StrCpy $R0 "$INSTDIR"

    idexalInstallDirDataBlockCheckDir:
      ; 旧阻断只检查最终安装目录直属的 .idexal，漏掉 data\.idexal 等子目录数据。
      ; 安装器覆盖安装时会管理整个安装目录树，递归命中任意 .idexal 都必须阻断。
      Push "$R0"
      Call IdexalFindNestedDataDir
      StrCmp $R2 "" idexalInstallDirDataBlockSkip idexalInstallDirDataBlockFound

    idexalInstallDirDataBlockFound:
      IfSilent idexalInstallDirDataBlockSilent

      !insertmacro MUI_HEADER_TEXT "$(IdexalBlockTitle)" "$(IdexalBlockSubtitle)"
      nsDialogs::Create 1018
      Pop $0
      StrCmp $0 error idexalInstallDirDataBlockDialogFailed 0

      ${NSD_CreateLabel} 0u 0u 300u 44u "$(IdexalDataFound)$\r$\n$R2"
      Pop $1
      ${NSD_CreateLabel} 0u 54u 300u 70u "$(IdexalDataFoundHint)"
      Pop $1

      GetDlgItem $1 $HWNDPARENT 1
      EnableWindow $1 0
      GetDlgItem $1 $HWNDPARENT 3
      EnableWindow $1 1
      SendMessage $1 ${WM_SETTEXT} 0 "STR:$(IdexalPickAnother)"
      Call IdexalResizeInstallDirBackButton

      nsDialogs::Show
      Return

    idexalInstallDirDataBlockDialogFailed:
      MessageBox MB_OK|MB_ICONSTOP "$(IdexalBlockedTitle)$\r$\n$(IdexalBlockedBody)"
      SetErrorLevel 1
      Quit

    idexalInstallDirDataBlockSilent:
      SetErrorLevel 1
      Quit

    idexalInstallDirDataBlockSkip:
      Abort
  FunctionEnd

  Function IdexalBlockInstallDirContainsDataLeave
    ; 阻断页的下一步按钮已禁用，但自动化或系统快捷键仍可能触发下一页。
    ; leave 回调只处理继续前进的路径，这里强制留在当前页，确保用户只能返回修改安装目录。
    Abort
  FunctionEnd

  Page custom IdexalBlockInstallDirContainsData IdexalBlockInstallDirContainsDataLeave
!macroend
