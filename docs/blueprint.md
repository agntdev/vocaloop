# VocabSRS — Bot specification

**Archetype:** education

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A private Telegram bot that teaches vocabulary using spaced repetition (SRS). Users can add/edit/delete word cards, group them into decks, set daily new-card limits, and review scheduled cards via a quick four-button rating workflow (Again / Hard / Good / Easy). The bot nudges users with reminders, tracks progress, and handles empty sessions with friendly messages.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- language learners
- mobile-first users
- private study

## Success criteria

- Users complete daily review sessions with 80%+ retention rate
- Users add at least 5 new cards per week on average
- Bot maintains session state across interruptions

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open the main menu and explain features
- **/stats** (command, actor: user, command: /stats) — Show user's learning progress and stats
- **Add Deck** (button, actor: user, callback: deck:add) — Create a new deck for organizing cards
- **Browse Decks** (button, actor: user, callback: deck:browse) — View and manage existing decks
- **Import Starter Decks** (button, actor: user, callback: deck:import_starter) — Import pre-built vocabulary decks
- **Start Reviews** (button, actor: user, callback: review:start) — Begin daily review session with scheduled cards
- **Daily New-Card Limit** (button, actor: user, callback: settings:new_card_limit) — Configure daily limit for new cards
- **Notification Schedule** (button, actor: user, callback: settings:notification_schedule) — Set or change daily reminder time

## Flows

### Onboarding
_Trigger:_ /start

1. Welcome message
2. Offer to import starter decks or create first deck
3. Show quick settings menu

_Data touched:_ User

### Deck Management
_Trigger:_ deck:add

1. Prompt for deck name
2. Create new deck
3. Confirm creation

_Data touched:_ Deck

### Card Management
_Trigger:_ card:add

1. Prompt for word (front)
2. Prompt for translation (back)
3. Prompt for optional example sentence
4. Create new card
5. Add to selected deck

_Data touched:_ Card, Deck

### Review Session
_Trigger:_ review:start

1. Show due cards count
2. Display first card front
3. Show Reveal button
4. Reveal card back and example
5. Show rating buttons (Again/Hard/Good/Easy)
6. Update card scheduling based on rating
7. Repeat until session complete or paused

_Data touched:_ Card, Review session

### Session Resumption
_Trigger:_ review:start (when session exists)

1. Resume from last position
2. Display next card
3. Continue review workflow

_Data touched:_ Review session, Card

### Settings Update
_Trigger:_ settings:new_card_limit

1. Prompt for new daily limit
2. Update user settings
3. Confirm change

_Data touched:_ User

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account identity and preferences
  - fields: telegram_id, daily_new_card_limit, notification_schedule, language_locale
- **Deck** _(retention: persistent)_ — Named collection of cards
  - fields: id, name, user_id, is_starter_deck
- **Card** _(retention: persistent)_ — Vocabulary card with SRS metadata
  - fields: id, deck_id, front, back, example_sentence, ease_factor, interval_days, repetition_count, due_date, last_reviewed, state
- **Review session** _(retention: session)_ — Transient state tracking current review session
  - fields: user_id, current_card_index, deck_id, session_start_time

## Integrations

- **Telegram** (required) — Bot API messaging
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- Configure starter decks
- Set default daily new-card limit
- Enable/disable optional digest forwarding
- Set default notification schedule

## Notifications

- Daily review reminder at configured time
- Session completion message with summary
- Empty session message with suggestions
- Progress milestone notifications (e.g., 100 cards learned)

## Permissions & privacy

- User data is private by default
- No automatic sharing of decks or cards
- User can export/import data as CSV
- User can delete account and all data

## Edge cases

- No due cards in review session
- User stops mid-session and resumes later
- User tries to edit a card during active review
- User exceeds daily new-card limit
- User imports invalid CSV format

## Required tests

- Verify review session resumption after interruption
- Test SM-2 scheduling updates for all rating buttons
- Validate CSV import/export format
- Confirm daily limit enforcement
- Test empty session handling with friendly suggestions

## Assumptions

- Using Telegram user ID as primary key for data privacy
- SM-2 algorithm is sufficient for SRS
- Default daily new-card limit of 10 is appropriate for most users
- Starter decks provide immediate value without overwhelming users
