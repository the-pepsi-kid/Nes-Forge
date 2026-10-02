; Courtyard — original teaching homebrew, native engine, no Forge metadata.
; Assemble with python3 build.py. RAM and ROM layout are documented in FORMAT.md.
frameReady = $00
playerX = $01
buttons = $02
candidateX = $03
musicFrame = $04
musicRow = $05
pointerLow = $06
pointerHigh = $07
ready = $08
frameCounter = $09
halfWidth = $0A

.org $8000
reset:
 SEI
 CLD
 LDX #$40
 STX $4017
 LDX #$FF
 TXS
 INX
 STX $2000
 STX $2001
 STX $4010
 STX $4015
waitVblank1:
 BIT $2002
 BPL waitVblank1
 LDA #0
clearRam:
 STA $0000,X
 STA $0200,X
 STA $0300,X
 STA $0400,X
 STA $0500,X
 STA $0600,X
 STA $0700,X
 INX
 BNE clearRam
 LDA #$FF
hideSprites:
 STA $0200,X
 INX
 BNE hideSprites
waitVblank2:
 BIT $2002
 BPL waitVblank2
 ; Load all 32 native NES palette bytes.
 LDA #$3F
 STA $2006
 LDA #0
 STA $2006
 LDX #0
loadPalette:
 LDA $D000,X
 STA $2007
 INX
 CPX #32
 BNE loadPalette
 ; Copy 1024 native room/attribute bytes to the PPU nametable.
 LDA #$20
 STA $2006
 LDA #0
 STA $2006
 STA pointerLow
 LDA #$B0
 STA pointerHigh
 LDY #0
 LDX #4
loadRoom:
 LDA (pointerLow),Y
 STA $2007
 INY
 BNE loadRoom
 INC pointerHigh
 DEX
 BNE loadRoom
 LDA $D022
 LSR A
 STA halfWidth
 LDA $D020
 STA playerX
 LDA #0
 STA $2005
 STA $2005
 LDA #1
 STA $4015
 LDA $D032
 STA $4000
 LDA $D033
 STA $4001
 ; First note plays immediately; subsequent notes advance every 12 frames.
 JSR playNote
 LDA #$88
 STA $2000
 LDA #$1E
 STA $2001
 LDA #1
 STA ready
main:
 LDA frameReady
 BEQ main
 LDA #0
 STA frameReady
 JSR readController
 JSR movePlayer
 JSR musicTick
 ; Refresh sprite 0 from native player config and current horizontal position.
 LDA $D021
 SEC
 SBC $D023
 SEC
 SBC #1
 STA $0200
 LDA #0
 STA $0201
 STA $0202
 LDA playerX
 SEC
 SBC halfWidth
 STA $0203
 LDA #0
 STA $2003
 LDA #2
 STA $4014
 LDA #0
 STA $2005
 STA $2005
 JMP main

readController:
 LDA #1
 STA $4016
 LDA #0
 STA $4016
 STA buttons
 LDX #8
readButton:
 LDA $4016
 LSR A
 ROL buttons
 DEX
 BNE readButton
 RTS

movePlayer:
 ; NES serial order A,B,Select,Start,Up,Down,Left,Right => bits7..0.
 LDA buttons
 AND #1
 BEQ tryLeft
 LDA playerX
 CLC
 ADC $D024
 CMP #253
 BCS movementDone
 STA candidateX
 JMP testCandidate
tryLeft:
 LDA buttons
 AND #2
 BEQ movementDone
 LDA playerX
 SEC
 SBC $D024
 BCC movementDone
 CMP #4
 BCC movementDone
 STA candidateX

testCandidate:
 ; Body occupies row25 at rest. Test both horizontal body edges in native
 ; collision data; collision is read from the ROM on every attempted move.
 LDA candidateX
 SEC
 SBC halfWidth
 LSR A
 LSR A
 LSR A
 TAX
 LDA $C320,X
 BNE movementDone
 LDA candidateX
 CLC
 ADC halfWidth
 SEC
 SBC #1
 LSR A
 LSR A
 LSR A
 TAX
 LDA $C320,X
 BNE movementDone
 LDA candidateX
 STA playerX
movementDone:
 RTS

musicTick:
 INC musicFrame
 LDA musicFrame
 CMP $D031
 BCC musicDone
 LDA #0
 STA musicFrame
 INC musicRow
 LDA musicRow
 CMP $D030
 BCC playNote
 LDA #0
 STA musicRow
playNote:
 LDA musicRow
 ASL A
 TAX
 LDA $D100,X
 STA $4002
 INX
 LDA $D100,X
 ORA #$08
 STA $4003
musicDone:
 RTS

nmi:
 PHA
 TXA
 PHA
 TYA
 PHA
 INC frameReady
 INC frameCounter
 PLA
 TAY
 PLA
 TAX
 PLA
 RTI
irq:
 RTI

.org $FFFA
.word nmi, reset, irq
