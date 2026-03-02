import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Screen } from '../components/Screen';
import { SurfaceCard } from '../components/SurfaceCard';
import { Typography } from '../components/Typography';
import { cssAngleToLinearPoints } from '../theme/gradient';
import { figmaV2Reference } from '../theme/figma-v2-reference';
import { GAP_PROFILE_SECTION } from '../theme/layout';

interface FlatSwatch {
  label: string;
  value: string;
}

interface GradientSwatch {
  label: string;
  from: string;
  to: string;
}

const backgroundSwatches: FlatSwatch[] = [
  { label: 'auth.start', value: figmaV2Reference.backgrounds.auth.linear.colors[0] },
  { label: 'auth.end', value: figmaV2Reference.backgrounds.auth.linear.colors[1] },
  { label: 'home.start', value: figmaV2Reference.backgrounds.home.linear.colors[0] },
  { label: 'home.end', value: figmaV2Reference.backgrounds.home.linear.colors[1] },
  { label: 'solo.start', value: figmaV2Reference.backgrounds.solo.linear.colors[0] },
  { label: 'solo.end', value: figmaV2Reference.backgrounds.solo.linear.colors[1] },
  { label: 'events.start', value: figmaV2Reference.backgrounds.events.linear.colors[0] },
  { label: 'events.end', value: figmaV2Reference.backgrounds.events.linear.colors[1] },
  { label: 'profile.start', value: figmaV2Reference.backgrounds.profile.linear.colors[0] },
  { label: 'profile.end', value: figmaV2Reference.backgrounds.profile.linear.colors[1] },
];

const surfaceSwatches: FlatSwatch[] = [
  { label: 'surface.default', value: figmaV2Reference.surfaces.default.backgroundColor },
  { label: 'surface.homeAlert', value: figmaV2Reference.surfaces.homeAlert.backgroundColor },
  { label: 'surface.profileRow', value: figmaV2Reference.surfaces.profileRow.backgroundColor },
  {
    label: 'surface.homeStatSmall',
    value: figmaV2Reference.surfaces.homeStatSmall.backgroundColor,
  },
];

const borderSwatches: FlatSwatch[] = [
  { label: 'shell.border', value: figmaV2Reference.shell.borderColor },
  { label: 'surface.default.border', value: figmaV2Reference.surfaces.default.borderColor },
  { label: 'surface.profileRow.border', value: figmaV2Reference.surfaces.profileRow.borderColor },
  { label: 'tab.container.border', value: figmaV2Reference.tabs.containerBorder },
  { label: 'tab.active.border', value: figmaV2Reference.tabs.activeBorder },
];

const textSwatches: FlatSwatch[] = [
  { label: 'text.heading', value: figmaV2Reference.text.heading },
  { label: 'text.body', value: figmaV2Reference.text.body },
  { label: 'text.bodyStrong', value: figmaV2Reference.text.bodyStrong },
  { label: 'text.caption', value: figmaV2Reference.text.caption },
  { label: 'text.label', value: figmaV2Reference.text.label },
];

const markerSwatches: FlatSwatch[] = [
  { label: 'marker.live', value: figmaV2Reference.markers.live },
  { label: 'marker.scheduled', value: figmaV2Reference.markers.scheduled },
  { label: 'marker.user', value: figmaV2Reference.markers.user },
];

const buttonSwatches: GradientSwatch[] = [
  {
    label: 'button.mint',
    from: figmaV2Reference.buttons.mint.from,
    to: figmaV2Reference.buttons.mint.to,
  },
  {
    label: 'button.gold',
    from: figmaV2Reference.buttons.gold.from,
    to: figmaV2Reference.buttons.gold.to,
  },
  {
    label: 'button.softGold',
    from: figmaV2Reference.buttons.softGold.from,
    to: figmaV2Reference.buttons.softGold.to,
  },
  {
    label: 'button.sky',
    from: figmaV2Reference.buttons.sky.from,
    to: figmaV2Reference.buttons.sky.to,
  },
  {
    label: 'button.secondary',
    from: figmaV2Reference.buttons.secondary.background,
    to: figmaV2Reference.buttons.secondary.background,
  },
];

function FlatSwatchRow({ label, value }: FlatSwatch) {
  return (
    <View style={styles.swatchRow}>
      <View style={[styles.swatchBlock, { backgroundColor: value }]} />
      <View style={styles.swatchMeta}>
        <Typography allowFontScaling={false} variant="Caption" weight="bold">
          {label}
        </Typography>
        <Typography
          allowFontScaling={false}
          color={figmaV2Reference.text.bodyStrong}
          variant="Caption"
        >
          {value}
        </Typography>
      </View>
    </View>
  );
}

function GradientSwatchRow({ from, label, to }: GradientSwatch) {
  return (
    <View style={styles.swatchRow}>
      <LinearGradient
        colors={[from, to]}
        end={cssAngleToLinearPoints(180).end}
        locations={[0, 1]}
        start={cssAngleToLinearPoints(180).start}
        style={styles.swatchBlock}
      />
      <View style={styles.swatchMeta}>
        <Typography allowFontScaling={false} variant="Caption" weight="bold">
          {label}
        </Typography>
        <Typography
          allowFontScaling={false}
          color={figmaV2Reference.text.bodyStrong}
          variant="Caption"
        >
          {`${from} -> ${to}`}
        </Typography>
      </View>
    </View>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  return (
    <SurfaceCard radius="md" style={styles.section}>
      <Typography allowFontScaling={false} variant="H2" weight="bold">
        {title}
      </Typography>
      {children}
    </SurfaceCard>
  );
}

export function ColorSwatchScreen() {
  return (
    <Screen contentContainerStyle={styles.content} variant="home">
      <Typography allowFontScaling={false} variant="H1" weight="bold">
        Color Swatch Debug
      </Typography>
      <Typography allowFontScaling={false} color={figmaV2Reference.text.body}>
        Values are read directly from `figma-v2-reference.ts`.
      </Typography>

      <Section title="Backgrounds">
        {backgroundSwatches.map((swatch) => (
          <FlatSwatchRow key={swatch.label} label={swatch.label} value={swatch.value} />
        ))}
      </Section>

      <Section title="Surfaces">
        {surfaceSwatches.map((swatch) => (
          <FlatSwatchRow key={swatch.label} label={swatch.label} value={swatch.value} />
        ))}
      </Section>

      <Section title="Borders">
        {borderSwatches.map((swatch) => (
          <FlatSwatchRow key={swatch.label} label={swatch.label} value={swatch.value} />
        ))}
      </Section>

      <Section title="Buttons">
        {buttonSwatches.map((swatch) => (
          <GradientSwatchRow key={swatch.label} {...swatch} />
        ))}
      </Section>

      <Section title="Text">
        {textSwatches.map((swatch) => (
          <FlatSwatchRow key={swatch.label} label={swatch.label} value={swatch.value} />
        ))}
      </Section>

      <Section title="Markers">
        {markerSwatches.map((swatch) => (
          <FlatSwatchRow key={swatch.label} label={swatch.label} value={swatch.value} />
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: GAP_PROFILE_SECTION,
    paddingBottom: GAP_PROFILE_SECTION,
  },
  section: {
    gap: GAP_PROFILE_SECTION,
  },
  swatchBlock: {
    borderColor: figmaV2Reference.shell.borderColor,
    borderRadius: 8,
    borderWidth: 1,
    height: 28,
    width: 56,
  },
  swatchMeta: {
    flex: 1,
    gap: 2,
  },
  swatchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
});
