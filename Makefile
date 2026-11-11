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
	src/pc/levelend.c \
	src/pc/boxhud.c \
	src/pc/boxtotals.c \
	src/pc/slash.c \
	src/pc/boxhud_game.c \
	src/pc/gfx/tex.c \
	src/pc/gfx/soft.c \
	src/pc/gfx/gl.c \
	src/pc/sound/util.c \
	src/pc/sound/midi.c \
	src/pc/sound/audio.c \
	src/pc/sound/mix.c \
	src/util/list.c \
	src/util/tree.c \
	src/ext/lib/gui.c \
	src/ext/lib/refl.c \
	src/ext/gui.c \
	src/ext/refl.c \
	src/ext/disgool.c

# test sources (run with utest.h), plus the game sources they test
TEST_SRC = $(wildcard tests/*.c) \
	src/ns.c \
	src/pc/pad.c \
	src/pc/controls.c \
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
	src/pc/levelend.c \
	src/pc/boxhud.c \
	src/pc/boxtotals.c \
	src/pc/slash.c \
	src/pc/sound/mix.c \
	src/pc/sound/util.c \
	src/ext/lib/gui.c \
	src/util/tree.c \
	src/util/list.c \
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
	src/launcher/node.c \
	src/launcher/command.c \
	src/launcher/level_editor.c \
	src/launcher/level_build.c

# the launcher (see doc/launcher.md), plus the game sources it uses
LAUNCHER_SRC = src/launcher/main.c \
	src/launcher/process.c \
	src/launcher/paths.c \
	src/launcher/game.c \
	src/launcher/game_section.c \
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
	src/launcher/node.c \
	src/launcher/command.c \
	src/launcher/ui.c \
	src/launcher/level_editor.c \
	src/launcher/level_build.c \
	src/launcher/levels_section.c \
	src/launcher/editor_section.c \
	src/pc/settings.c \
	src/pc/controls.c \
	src/pc/config.c

OBJ = $(SRC:.c=.o)
OUT = build/c1
TEST_OUT = build/tests
# the launcher's _ sorts it first in build/
LAUNCHER_OUT = build/_launcher
# the level build with node built in, for the launcher (see doc/building.md)
BUILDER_OUT = build/build-level

# include dirs.
INCLUDE = -I./src/

# C compiler flags (-g -O3 -Wall)
DEFS = -DCFLAGS_GFX_SW_PERSP -DCFLAGS_DRAW_EXTENSIONS -DCFLAGS_GUI -DCFLAGS_GOOL_DEBUG
CFLAGS = -g -fplan9-extensions -m32 -std=gnu17 -Wno-error=incompatible-pointer-types
TEST_CFLAGS = -g -fplan9-extensions -m32 -std=gnu17
TEST_LDLIBS = -lSDL2 -lstdc++
ifeq ($(OS),Windows_NT)
LDLIBS = -lmingw32 -lSDL2main -lSDL2 -lopengl32 -lfluidsynth-3 -lm -lstdc++
OUT = build/c1.exe
TEST_OUT = build/tests.exe
LAUNCHER_OUT = build/_launcher.exe
BUILDER_OUT = build/build-level.exe
LAUNCHER_LDLIBS = -lmingw32 -lSDL2main -lSDL2 -lopengl32 -lws2_32 -lcomdlg32 -lm -lstdc++ -mwindows
else
LDLIBS = -lSDL2 -lGL -lfluidsynth -lm -lstdc++
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
# the tests use the in-game gui library but not the sdl/opengl backends
TEST_CIMGUI_OBJ = $(filter-out $(CIMGUI_PATH)/imgui/backends/%,$(CIMGUI_OBJ))
OBJ += $(SRC:.c=.o)
LAUNCHER_OBJ = $(CIMGUI_OBJ) $(LAUNCHER_SRC:.c=.o)

# the level build's sources, and the editor's code it shares
EDITOR_PATH = tools/level_editor
BUILDER_SRC = $(wildcard $(EDITOR_PATH)/builder/*.ts $(EDITOR_PATH)/src/*.ts) 	$(EDITOR_PATH)/scripts/builderExe.ts $(EDITOR_PATH)/package.json
# making build-level needs node; without it make builds the rest and says so
HAVE_NODE := $(shell node --version 2>/dev/null)

all: $(SRC) $(OUT) $(LAUNCHER_OUT) builder

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

$(OUT): $(OBJ)
	@mkdir -p $(dir $(OUT))
	$(CC) $(OBJ) -o $(OUT) $(CFLAGS)
ifeq ($(OS),Windows_NT)
	$(MAKE) dlls

# copy the toolchain dlls c1.exe depends on into build/, so it runs outside msys2
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

.PHONY: builder
ifneq ($(HAVE_NODE),)
builder: $(BUILDER_OUT)
else
builder:
	@echo "skipping $(BUILDER_OUT): it needs Node.js 18 or later (see doc/building.md)"
endif

# installs the editor's packages first if need be
$(BUILDER_OUT): $(BUILDER_SRC)
	cd $(EDITOR_PATH) && { [ -d node_modules ] || npm install; } && npm run builder-exe

$(LAUNCHER_OUT): $(LAUNCHER_OBJ)
	@mkdir -p $(dir $(LAUNCHER_OUT))
	$(CC) $(LAUNCHER_OBJ) -o $(LAUNCHER_OUT) -m32 $(LAUNCHER_LDLIBS)

.PHONY: test
test: $(TEST_OUT)
	./$(TEST_OUT)

$(TEST_OUT): $(TEST_SRC) tests/utest.h $(TEST_CIMGUI_OBJ)
	@mkdir -p $(dir $(TEST_OUT))
	$(CC) $(INCLUDE) $(TEST_SRC) $(TEST_CIMGUI_OBJ) -o $(TEST_OUT) $(TEST_CFLAGS) $(TEST_LDLIBS)
