import { describe, expect, it } from 'vitest';
import type { SubtitleDisplayTrack } from '../../rendering/domain/SubtitleDisplayTrack';
import { DEFAULT_SUBTITLE_DISPLAY_SETTINGS } from '../../rendering/domain/SubtitleDisplaySettings';
import {
  createEstimatedTimedTextUnits,
  SubtitlePhraseCardPlanner,
} from '../../rendering/planning/SubtitlePhraseCardPlanner';
import { hasLargeTextOverlap } from '../../rendering/planning/validatePhraseCards';
import { SubtitleScheduler } from '../../rendering/scheduling/SubtitleScheduler';
import { FakePlayerAdapter } from '../fakes/FakePlayerAdapter';

describe('SubtitlePhraseCardPlanner', () => {
  it('does not create one card per timed word', () => {
    const planner = new SubtitlePhraseCardPlanner();
    const units = createEstimatedTimedTextUnits({
      idPrefix: 'fixture',
      parentCueId: 'cue',
      startMs: 10_000,
      endMs: 12_900,
      text: 'As a conservative she cannot critique capitalism too closely.',
    });

    const cards = planner.plan({
      units,
      sourceLanguage: 'en',
      targetLanguage: 'en',
      timingSource: 'estimated',
      idPrefix: 'fixture',
    });

    expect(cards.length).toBeLessThanOrEqual(2);
    expect(cards.length).toBeLessThan(units.length);
  });

  it('holds normal phrase cards for at least 1200 ms', () => {
    const planner = new SubtitlePhraseCardPlanner();
    const cards = planner.plan({
      units: createEstimatedTimedTextUnits({
        idPrefix: 'normal',
        parentCueId: 'cue',
        startMs: 0,
        endMs: 6_000,
        text: 'As a conservative, she cannot critique capitalism too closely because it would question her position.',
      }),
      sourceLanguage: 'en',
      targetLanguage: 'en',
      timingSource: 'estimated',
      idPrefix: 'normal',
    });

    for (const card of cards) {
      expect(card.endMs - card.startMs).toBeGreaterThanOrEqual(1_200);
    }
  });

  it('does not copy a previous card into the next card', () => {
    const planner = new SubtitlePhraseCardPlanner();
    const cards = planner.plan({
      units: createEstimatedTimedTextUnits({
        idPrefix: 'overlap',
        parentCueId: 'cue',
        startMs: 0,
        endMs: 7_000,
        text: 'Anyway, I recently read Plunder, a book about private equity and modern capitalism.',
      }),
      sourceLanguage: 'en',
      targetLanguage: 'en',
      timingSource: 'estimated',
      idPrefix: 'overlap',
    });

    for (let index = 1; index < cards.length; index += 1) {
      expect(hasLargeTextOverlap(cards[index - 1].originalText, cards[index].originalText)).toBe(false);
    }
  });

  it('prefers a sentence boundary over a fixed word count', () => {
    const planner = new SubtitlePhraseCardPlanner();
    const cards = planner.plan({
      units: createEstimatedTimedTextUnits({
        idPrefix: 'punctuation',
        parentCueId: 'cue',
        startMs: 0,
        endMs: 5_000,
        text: 'Anyway, I recently read Plunder. A book about private equity changed my thinking.',
      }),
      sourceLanguage: 'en',
      targetLanguage: 'en',
      timingSource: 'estimated',
      idPrefix: 'punctuation',
    });

    expect(cards[0].originalText).toBe('Anyway, I recently read Plunder.');
  });

  it('does not modify card text during its interval and changes once at the boundary', async () => {
    const player = new FakePlayerAdapter();
    const track: SubtitleDisplayTrack = {
      sessionId: 'session',
      videoId: 'video',
      sourceLanguage: 'en',
      targetLanguage: 'en',
      durationMs: 2_400,
      planningVersion: 'test',
      slices: [
        {
          id: 'card-1',
          parentCueId: 'cue-1',
          sliceIndex: 0,
          startMs: 0,
          endMs: 1_200,
          originalText: 'First stable card.',
          translatedText: 'First stable card.',
          sourceLanguage: 'en',
          targetLanguage: 'en',
          timingSource: 'estimated',
          cumulativeWindow: false,
        },
        {
          id: 'card-2',
          parentCueId: 'cue-2',
          sliceIndex: 1,
          startMs: 1_200,
          endMs: 2_400,
          originalText: 'Second stable card.',
          translatedText: 'Second stable card.',
          sourceLanguage: 'en',
          targetLanguage: 'en',
          timingSource: 'estimated',
          cumulativeWindow: false,
        },
      ],
    };
    const rendered: string[] = [];
    const scheduler = new SubtitleScheduler(player, track, DEFAULT_SUBTITLE_DISPLAY_SETTINGS, (snapshot) => {
      if (snapshot.slice) rendered.push(snapshot.slice.translatedText ?? snapshot.slice.originalText);
    });

    scheduler.start();
    player.setTime(500);
    player.setTime(1_100);
    expect(rendered).toEqual(['First stable card.']);

    player.setTime(1_200);
    expect(rendered).toEqual(['First stable card.', 'Second stable card.']);

    await scheduler.dispose();
  });
});
