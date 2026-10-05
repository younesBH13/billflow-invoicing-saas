Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Get the directory where this VBS file is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batFile = scriptDir & "\start-billflow.bat"

' Run the batch file hidden (0 = hide window, True = wait for it to finish is False here)
WshShell.Run chr(34) & batFile & chr(34), 0, False

' Optional: Show a notification that the app is starting
WshShell.Popup "BillFlow is starting..." & vbCrLf & "Please wait a few seconds.", 3, "BillFlow", 64
