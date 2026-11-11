#ifndef _LAUNCHER_SETTINGS_SECTION_H_
#define _LAUNCHER_SETTINGS_SECTION_H_

extern void LoadSettingsSection(const char *repo);
extern int SaveSettingsSection(const char *repo);
extern void UpdateSettingsSection(const char *repo);
extern void DrawSettingsSection(const char *repo);

/* list the custom levels again for the boot level dropdown, as after a build */
extern void ListSettingsLevels(const char *repo);

/* boot into level, saving settings.cfg, as once it's built */
extern void BootIntoLevel(const char *repo, const char *level);

#endif /* _LAUNCHER_SETTINGS_SECTION_H_ */
