import { useMemo } from 'react';
import { Container, Graphics, Stage, Text } from '@pixi/react';

const mapWidth = 1100;
const mapHeight = 760;

const levelPositions = [
  { x: 210, y: 120 },
  { x: 860, y: 240 },
  { x: 290, y: 390 },
  { x: 820, y: 560 },
  { x: 380, y: 680 },
];

function drawBackground(graphics) {
  graphics.clear();
  graphics.beginFill(0xf7f8ff);
  graphics.drawRoundedRect(0, 0, mapWidth, mapHeight, 36);
  graphics.endFill();

  graphics.beginFill(0xffefbd, 0.7);
  graphics.drawCircle(150, 110, 110);
  graphics.endFill();

  graphics.beginFill(0xcff4e3, 0.6);
  graphics.drawCircle(950, 620, 120);
  graphics.endFill();
}

function drawPath(graphics, levels) {
  graphics.clear();
  graphics.lineStyle(16, 0xffd768, 0.95);

  for (let index = 0; index < levels.length - 1; index += 1) {
    const current = levels[index];
    const next = levels[index + 1];
    const controlX = (current.x + next.x) / 2;
    const controlY = Math.min(current.y, next.y) - 40;

    graphics.moveTo(current.x, current.y);
    graphics.quadraticCurveTo(controlX, controlY, next.x, next.y);
  }
}

function drawLevelBubble(graphics, level) {
  const baseColor =
    level.status === 'locked'
      ? 0xa4aec2
      : level.isCompleted
        ? 0x6fd28d
        : 0xf29b2e;

  graphics.clear();
  graphics.beginFill(baseColor);
  graphics.drawCircle(0, 0, 46);
  graphics.endFill();

  graphics.beginFill(0xffffff, 0.18);
  graphics.drawCircle(-12, -14, 16);
  graphics.endFill();
}

function drawRewardGlow(graphics) {
  graphics.clear();
  graphics.beginFill(0x7bd7ff, 0.22);
  graphics.drawCircle(0, 0, 58);
  graphics.endFill();
}

function makeTextStyle(fontSize, color = '#1d2433') {
  return {
    fill: color,
    fontFamily: 'Trebuchet MS, Segoe UI, sans-serif',
    fontSize,
    fontWeight: '700',
    align: 'center',
    wordWrap: true,
    wordWrapWidth: 180,
  };
}

export default function WorldMapPixi({ worldProgress, unlockedPokemon }) {
  const levels = useMemo(() => {
    return worldProgress.map((entry, index) => ({
      ...entry,
      ...levelPositions[index],
      levelNumber: index + 1,
    }));
  }, [worldProgress]);

  const rewards = useMemo(() => {
    return unlockedPokemon.slice(0, 3).map((pokemon, index) => ({
      ...pokemon,
      x: 160 + index * 170,
      y: 70,
    }));
  }, [unlockedPokemon]);

  return (
    <div className="pixi-map-shell">
      <Stage width={mapWidth} height={mapHeight} options={{ backgroundAlpha: 0 }}>
        <Graphics draw={drawBackground} />
        <Graphics draw={(graphics) => drawPath(graphics, levels)} />

        {rewards.map((reward) => (
          <Container key={reward.id} x={reward.x} y={reward.y}>
            <Graphics draw={drawRewardGlow} />
            <Text
              text={`★ ${reward.name}`}
              anchor={0.5}
              style={makeTextStyle(20, '#1a5e7e')}
            />
          </Container>
        ))}

        {levels.map((level) => (
          <Container key={level.story.id} x={level.x} y={level.y}>
            <Graphics draw={(graphics) => drawLevelBubble(graphics, level)} />

            <Text
              text={String(level.levelNumber)}
              anchor={0.5}
              y={-2}
              style={makeTextStyle(28, '#ffffff')}
            />

            <Text
              text={level.story.title}
              anchor={0.5}
              y={66}
              style={makeTextStyle(18)}
            />

            <Text
              text={
                level.status === 'locked'
                  ? 'Bloqueado'
                  : level.isCompleted
                    ? 'Completado'
                    : 'Disponible'
              }
              anchor={0.5}
              y={102}
              style={makeTextStyle(
                15,
                level.status === 'locked' ? '#6a7388' : '#c66b1d',
              )}
            />
          </Container>
        ))}
      </Stage>
    </div>
  );
}
