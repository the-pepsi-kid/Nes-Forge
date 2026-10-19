# Windows extraction packaging correction

The supplied Windows Explorer screenshot reports 0x80010135, Path too long, while extracting the original review ZIP under a nested working directory. The earlier Linux extraction/browser audit did not cover Windows destination-path length; it did not establish Explorer compatibility.

The replacement is NF_Review_Kit.zip. It has no additional enclosing folder inside the ZIP, and the complete preserved original kit is under RC3/ rather than Reference/Historical_Build_Records/RC3/. No original guide, manual, example or app bytes were dropped. All 164 original files remain byte-identical in RC3/. The same verified app is included as NES_Forge.html.

Choose Extract All and a short destination such as C:/NF, then open START_HERE.html. Cancel the incomplete earlier extraction; do not use Skip to create a partial kit.

The longest ZIP member decreased from 162 to 85 UTF-16 units. The new packager checks case collisions, Windows reserved/invalid names, and legacy file/directory path budgets with a 159-unit simulated destination. Fresh extraction verifies all 333 inventoried files; all 685 checked documentation links resolve. The actual launch link opens native-audio-library-1. No physical Windows Explorer test is claimed. See Windows_Zip_Check.json and Review_Kit.json.
