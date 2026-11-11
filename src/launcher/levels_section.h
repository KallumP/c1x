#ifndef _LAUNCHER_LEVELS_SECTION_H_
#define _LAUNCHER_LEVELS_SECTION_H_

extern void LoadLevelsSection(const char *repo);
extern void UpdateLevelsSection(const char *repo);
extern void DrawLevelsSection(const char *repo);

/* building a level, as the boot level dropdown does for one that isn't built */
extern int CanBuildLevels(const char *repo);
extern void StartLevelBuild(const char *repo, const char *level);
extern void DrawLevelBuildStatus(void);

#endif /* _LAUNCHER_LEVELS_SECTION_H_ */
