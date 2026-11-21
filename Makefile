# c1 Makefile

# sources
SRC =	src/ns.c \
	src/pad.c \
	src/math.c \
	src/audio.c \
	src/midi.c \
	src/cam.c \
	src/solid.c \
	src/slst.c \
	src/level.c \
	src/misc.c \
	src/gfx.c \
	src/gool.c \
	src/pbak.c \
	src/title.c \
	src/main.c \
	src/pc/init.c \
	src/pc/math.c \
	src/pc/pad.c \
	src/pc/controls.c \
	src/pc/gamepad.c \
	src/pc/config.c \
	src/pc/settings.c \
	src/pc/speed.c \
	src/pc/loading.c \
	src/pc/time.c \
	src/pc/replay.c \
	src/pc/follow.c \
	src/pc/tween.c \
	src/pc/fps.c \
	src/pc/spin.c \
	src/pc/jumpgrace.c \
	src/pc/levelend.c \
	src/pc/audiosong.c \
	src/pc/boxhud.c \
	src/pc/enhancedtitle.c \
	src/pc/custommenu.c \
	src/pc/boxtotals.c \
	src/pc/card.c \
	src/pc/cardicon.c \
	src/pc/card_game.c \
	src/pc/savepoint.c \
	src/pc/slash.c \
	src/pc/screen_fit.c \
	src/pc/fullscreen.c \
	src/pc/boxhud_game.c \
	src/pc/enhancedtitle_game.c \
	src/pc/custommenu_game.c \
	src/pc/savepoint_game.c \
	src/pc/gfx/tex.c \
	src/pc/gfx/soft.c \
	src/pc/gfx/gl.c \
	src/pc/sound/util.c \
	src/pc/sound/midi.c \
	src/pc/sound/stream.c \
	src/pc/sound/audio.c \
	src/pc/sound/mix.c \
	src/ext/gui.c

# test sources (run with utest.h), plus the game sources they test
TEST_SRC = $(wildcard tests/*.c) \
	src/ns.c \
	src/pc/math.c \
	src/pc/pad.c \
	src/pc/controls.c \
	src/pc/gamepad.c \
	src/pc/config.c \
	src/pc/settings.c \
	src/pc/speed.c \
	src/pc/loading.c \
	src/pc/time.c \
	src/pc/replay.c \
	src/pc/follow.c \
	src/pc/tween.c \
	src/pc/fps.c \
	src/pc/spin.c \
	src/pc/jumpgrace.c \
	src/pc/levelend.c \
	src/pc/audiosong.c \
	src/pc/boxhud.c \
	src/pc/enhancedtitle.c \
	src/pc/custommenu.c \
	src/pc/boxtotals.c \
	src/pc/card.c \
	src/pc/cardicon.c \
	src/pc/savepoint.c \
	src/pc/slash.c \
	src/pc/screen_fit.c \
	src/pc/fullscreen.c \
	src/pc/sound/mix.c \
	src/pc/sound/stream.c \
	src/pc/sound/util.c \
	src/launcher/process.c \
	src/launcher/paths.c \
	src/launcher/game.c \
	src/launcher/settings_file.c \
	src/launcher/text_file.c \
	src/launcher/controls_file.c \
	src/launcher/levels.c \
	src/launcher/streams.c \
	src/launcher/extract.c \
	src/launcher/disc_image.c \
	src/launcher/extraction.c \
	src/launcher/command.c \
	src/launcher/level_editor.c \
	src/launcher/tools.c \
	src/launcher/level_build.c \
	src/launcher/help.c

# the launcher (see doc/launcher.md), plus the game sources it uses
LAUNCHER_SRC = src/launcher/main.c \
	src/launcher/process.c \
	src/launcher/paths.c \
	src/launcher/game.c \
	src/launcher/game_section.c \
	src/launcher/help.c \
	src/launcher/help_section.c \
	src/launcher/settings_file.c \
	src/launcher/text_file.c \
	src/launcher/controls_file.c \
	src/launcher/controls_section.c \
	src/launcher/settings_section.c \
	src/launcher/levels.c \
	src/launcher/streams.c \
	src/launcher/extract.c \
	src/launcher/disc_image.c \
	src/launcher/extraction.c \
	src/launcher/extract_section.c \
	src/launcher/file_dialog.c \
	src/launcher/command.c \
	src/launcher/ui.c \
	src/launcher/level_editor.c \
	src/launcher/tools.c \
	src/launcher/level_build.c \
	src/launcher/levels_section.c \
	src/launcher/editor_section.c \
	src/pc/settings.c \
	src/pc/controls.c \
	src/pc/gamepad.c \
	src/pc/config.c

OBJ = $(SRC:.c=.o)
OUT = build/c1x
TEST_OUT = build/tests
# the launcher, in the top folder: the first thing a player opens
LAUNCHER_OUT = c1x_launcher
# the level build and the level editor with node built in, for the launcher (see doc/building.md)
TOOLS_OUT = build/c1x_tools

# include dirs.
INCLUDE = -I./src/

# C compiler flags (-g -O3 -Wall)
DEFS = -DCFLAGS_GFX_SW_PERSP -DCFLAGS_DRAW_EXTENSIONS -DCFLAGS_GUI
CFLAGS = -g -fplan9-extensions -m32 -std=gnu17 -Wno-error=incompatible-pointer-types
TEST_CFLAGS = -g -fplan9-extensions -m32 -std=gnu17
TEST_LDLIBS = -lSDL2 -lsndfile -lm -lstdc++
ifeq ($(OS),Windows_NT)
LDLIBS = -lmingw32 -lSDL2main -lSDL2 -lopengl32 -lfluidsynth-3 -lsndfile -lm -lstdc++
OUT = build/c1x.exe
TEST_OUT = build/tests.exe
LAUNCHER_OUT = c1x_launcher.exe
TOOLS_OUT = build/c1x_tools.exe
# linked statically, so the launcher needs no dlls beside it in the top folder
LAUNCHER_LDLIBS = -static -lmingw32 -lSDL2main -lSDL2 -lopengl32 -lws2_32 -lcomdlg32 -lm -lstdc++ -mwindows \
	-lkernel32 -luser32 -lgdi32 -lwinmm -limm32 -lole32 -loleaut32 -lversion -luuid -ladvapi32 -lsetupapi -lshell32 -ldinput8
# each exe's icon (res/*.ico), linked in as a windows resource
GAME_ICON_OBJ = res/c1x_icon.o
LAUNCHER_ICON_OBJ = res/c1x_launcher_icon.o
else
LDLIBS = -lSDL2 -lGL -lfluidsynth -lsndfile -lm -lstdc++
LAUNCHER_LDLIBS = -lSDL2 -lGL -lm -lstdc++
endif
CFLAGS += $(LDLIBS) $(DEFS)

# compiler/make
CC = gcc
MAKE = make

# [c]imgui
CIMGUI_PATH = ./src/ext/lib/cimgui
CIMGUI_OBJ = $(CIMGUI_PATH)/imgui/backends/imgui_impl_opengl2.o \
	$(CIMGUI_PATH)/imgui/backends/imgui_impl_sdl.o \
	$(CIMGUI_PATH)/imgui/imgui_draw.o \
	$(CIMGUI_PATH)/imgui/imgui_tables.o \
	$(CIMGUI_PATH)/imgui/imgui_widgets.o \
	$(CIMGUI_PATH)/imgui/imgui.o \
	$(CIMGUI_PATH)/cimgui.o
INCLUDE += -I$(CIMGUI_PATH) -I$(CIMGUI_PATH)/imgui
OBJ = $(CIMGUI_OBJ)
OBJ += $(SRC:.c=.o)
LAUNCHER_OBJ = $(CIMGUI_OBJ) $(LAUNCHER_SRC:.c=.o)

# the tools' sources: the level build, the editor's server, and the editor's code they share
EDITOR_PATH = tools/level_editor
TOOLS_SRC = $(wildcard $(EDITOR_PATH)/builder/*.ts $(EDITOR_PATH)/src/*.ts $(EDITOR_PATH)/server/*.ts $(EDITOR_PATH)/scripts/tools*.ts) \
	$(EDITOR_PATH)/package.json
# the level editor's page, built by vite into build/editor for the tools to serve, and its sources
EDITOR_PAGE = build/editor/index.html
EDITOR_PAGE_SRC = $(wildcard $(EDITOR_PATH)/src/*.ts $(EDITOR_PATH)/src/*.tsx $(EDITOR_PATH)/src/*/*.ts $(EDITOR_PATH)/src/*/*.tsx) \
	$(EDITOR_PATH)/index.html $(EDITOR_PATH)/vite.config.ts $(EDITOR_PATH)/package.json
# making the tools needs node; without it make builds the rest and says so
HAVE_NODE := $(shell node --version 2>/dev/null)

all: $(SRC) $(OUT) $(LAUNCHER_OUT) tools

clean:
	rm -r $(OBJ) $(OUT)
	rm -f $(TEST_OUT) $(LAUNCHER_OUT) $(LAUNCHER_SRC:.c=.o)
ifeq ($(OS),Windows_NT)
	rm -rf $(dir $(OUT))
endif

#install:
#	...

$(CIMGUI_OBJ):
	cd $(CIMGUI_PATH) && $(MAKE)

.c.o:
	$(CC) $(INCLUDE) -c $< -o $@ $(CFLAGS)

res/%_icon.o: res/%.rc res/%.ico
	windres -F pe-i386 --include-dir res $< -o $@

$(OUT): $(OBJ) $(GAME_ICON_OBJ)
	@mkdir -p $(dir $(OUT))
	$(CC) $(OBJ) $(GAME_ICON_OBJ) -o $(OUT) $(CFLAGS)
ifeq ($(OS),Windows_NT)
	$(MAKE) dlls

# copy the toolchain dlls c1x.exe depends on into build/, so it runs outside msys2
DLLDIR = $(dir $(shell which gcc))
dlls: $(OUT)
	@todo="$(OUT)"; seen=""; \
	while [ -n "$$todo" ]; do set -- $$todo; f=$$1; shift; todo="$$*"; \
	  for d in $$(objdump -p "$$f" | sed -n 's/.*DLL Name: //p' | tr -d '\r'); do \
	    [ -f "$(DLLDIR)$$d" ] || continue; \
	    case " $$seen " in *" $$d "*) ;; *) seen="$$seen $$d"; todo="$$todo $(DLLDIR)$$d";; esac; \
	  done; \
	done; \
	for d in $$seen; do cp -u "$(DLLDIR)$$d" $(dir $(OUT)); done; \
	echo "copied dlls:$$seen"
endif

.PHONY: launcher
launcher: $(LAUNCHER_OUT)

.PHONY: tools
ifneq ($(HAVE_NODE),)
tools: $(TOOLS_OUT) $(EDITOR_PAGE)
else
tools:
	@echo "skipping $(TOOLS_OUT) and the level editor's page: they need Node.js 18 or later (see doc/building.md)"
endif

# both install the editor's packages first if need be
$(TOOLS_OUT): $(TOOLS_SRC)
	cd $(EDITOR_PATH) && { [ -d node_modules ] || npm install; } && npm run tools-exe

$(EDITOR_PAGE): $(EDITOR_PAGE_SRC)
	cd $(EDITOR_PATH) && { [ -d node_modules ] || npm install; } && npm run build

$(LAUNCHER_OUT): $(LAUNCHER_OBJ) $(LAUNCHER_ICON_OBJ)
	@mkdir -p $(dir $(LAUNCHER_OUT))
	$(CC) $(LAUNCHER_OBJ) $(LAUNCHER_ICON_OBJ) -o $(LAUNCHER_OUT) -m32 $(LAUNCHER_LDLIBS)

.PHONY: test
test: $(TEST_OUT)
	./$(TEST_OUT)

$(TEST_OUT): $(TEST_SRC) tests/utest.h
	@mkdir -p $(dir $(TEST_OUT))
	$(CC) $(INCLUDE) $(TEST_SRC) -o $(TEST_OUT) $(TEST_CFLAGS) $(TEST_LDLIBS)
