import { describe, test, expect } from 'vitest';
import { ConfigProcessor } from '../../../src/helperModules/ConfigProcessor';
import {
  PrefOptionsConfig,
  PrefOptionsConfigSchema
} from '../../../src/schemas/yaml/prefOptions';
import { Frontmatter, FrontmatterSchema } from '../../../src/schemas/yaml/frontMatter';

describe('ConfigProcessor.getDefaultValuesByPrefId', () => {
  const prefOptions: PrefOptionsConfig = {
    color_options: [
      { id: 'blue', display_name: 'Blue', default: true },
      { id: 'red', display_name: 'Red' }
    ],
    finish_options: [
      { id: 'matte', display_name: 'Matte' },
      { id: 'eggshell', display_name: 'Eggshell', default: true },
      { id: 'gloss', display_name: 'Gloss' }
    ],
    matte_blue_paint_options: [
      { id: 'powder_blue', display_name: 'Powder Blue', default: true }
    ],
    eggshell_blue_paint_options: [
      { id: 'elegant_royal', display_name: 'Elegant Royal', default: true },
      { id: 'robins_egg', display_name: "Robin's Egg" }
    ],
    gloss_blue_paint_options: [
      { id: 'sky_blue', display_name: 'Sky Blue', default: true },
      { id: 'navy', display_name: 'Navy' }
    ],
    matte_red_paint_options: [
      { id: 'brick', display_name: 'Brick', default: true },
      { id: 'scarlet', display_name: 'Scarlet' }
    ],
    eggshell_red_paint_options: [
      { id: 'rose', display_name: 'Rose', default: true },
      { id: 'ruby', display_name: 'Ruby' }
    ],
    gloss_red_paint_options: [
      { id: 'fire_engine', display_name: 'Fire Engine', default: true },
      { id: 'crimson', display_name: 'Crimson' }
    ]
  };
  PrefOptionsConfigSchema.parse(prefOptions);

  const frontmatter: Frontmatter = {
    title: 'My Page',
    page_preferences: [
      {
        display_name: 'Color',
        id: 'color',
        options_source: 'color_options'
      },
      {
        display_name: 'Finish',
        id: 'finish',
        options_source: 'finish_options'
      },
      {
        display_name: 'Paint color',
        id: 'paint',
        options_source: '<FINISH>_<COLOR>_paint_options'
      }
    ]
  };
  FrontmatterSchema.parse(frontmatter);

  test('derives the default values for each preference', () => {
    const defaultValuesByPrefId = ConfigProcessor.getDefaultValuesByPrefId(
      frontmatter,
      prefOptions
    );
    expect(defaultValuesByPrefId).toEqual({
      color: 'blue',
      finish: 'eggshell',
      paint: 'elegant_royal'
    });
  });
});
