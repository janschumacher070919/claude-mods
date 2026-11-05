# claude-mods

Eigene Mods für Claude Code.

## Mods

### dashboard

Öffnet ein Panel neben dem Chat, das dauerhaft sichtbar bleibt und sich
selbst aktualisiert:

- **To-dos:** die Aufgaben der Task-Liste der Sitzung mit Status
  (`[ ]` offen, `[~]` in Arbeit, `[x]` erledigt, erledigte durchgestrichen).
- **Mods:** die installierten Mods und alle, die nach dem Dashboard geladen
  werden; grüner Punkt = eingeschaltet.

`/dashboard` blendet das Panel ein und aus, ohne dass Claude antwortet.

Grenzen: Die Mods-API kann nicht alle geladenen Mods auflisten. Mods, die vor
dem Dashboard per `--plugin-dir` geladen wurden, können fehlen. Aufgaben, die
vor dem Laden angelegt wurden, erscheinen erst, wenn Claude die Liste abruft.

Der Mod nutzt nur die Mods-API: kein Netzwerk, keine Dateien außerhalb seines
Ordners.

## Installieren

In Claude Code (Eingabezeile):

```
/plugin install dashboard --marketplace janschumacher070919/claude-mods
```

Oder im Terminal:

```bash
claude plugin install dashboard --marketplace janschumacher070919/claude-mods
```

Danach Claude Code neu starten oder `/reload-plugins` eingeben.

Ist das Repo privat, braucht Claude Code dafür Zugriff auf GitHub, zum
Beispiel nach einmaligem `gh auth login`.
