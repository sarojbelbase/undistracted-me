/**
 * Curated quotes — displayed in the Daily Quote widget (one per day).
 *
 * Each entry: { text: string, author: string, category: string }
 *
 * Categories: Philosophy · Focus · Science · Creativity · Resilience
 *
 * Quotes are SHORT (max 2 sentences) and correctly attributed.
 * The widget picks one deterministically by day so the same quote
 * shows for all users on the same calendar day.
 */
export const QUOTES = [

  // ─── Philosophy ─────────────────────────────────────────────────────────────
  {
    text: "You have power over your mind, not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius",
    category: "Philosophy",
  },
  {
    text: "Waste no more time arguing about what a good man should be. Be one.",
    author: "Marcus Aurelius",
    category: "Philosophy",
  },
  {
    text: "While we are postponing, life speeds by.",
    author: "Seneca",
    category: "Philosophy",
  },
  {
    text: "We suffer more in imagination than in reality.",
    author: "Seneca",
    category: "Philosophy",
  },
  {
    text: "Make the best use of what is in your power, and take the rest as it happens.",
    author: "Epictetus",
    category: "Philosophy",
  },
  {
    text: "Seek not the good in external things; seek it in yourself.",
    author: "Epictetus",
    category: "Philosophy",
  },
  {
    text: "The only way to make sense out of change is to plunge into it, move with it, and join the dance.",
    author: "Alan Watts",
    category: "Philosophy",
  },
  {
    text: "The art of living is neither careless drifting on the one hand nor fearful clinging on the other.",
    author: "Alan Watts",
    category: "Philosophy",
  },
  {
    text: "In the midst of winter, I found there was, within me, an invincible summer.",
    author: "Albert Camus",
    category: "Philosophy",
  },
  {
    text: "You will never be happy if you continue to search for what happiness consists of.",
    author: "Albert Camus",
    category: "Philosophy",
  },
  {
    text: "I live my life in widening circles that reach out across the world.",
    author: "Rainer Maria Rilke",
    category: "Philosophy",
  },
  {
    text: "Perhaps all the dragons in our lives are princesses who are only waiting to see us act, just once, with beauty and courage.",
    author: "Rainer Maria Rilke",
    category: "Philosophy",
  },
  {
    text: "Change your life today. Don't gamble on the future, act now, without delay.",
    author: "Simone de Beauvoir",
    category: "Philosophy",
  },
  {
    text: "One's life has value so long as one attributes value to the life of others.",
    author: "Simone de Beauvoir",
    category: "Philosophy",
  },

  // ─── Focus ──────────────────────────────────────────────────────────────────
  {
    text: "Deep work is the ability to focus without distraction on a cognitively demanding task.",
    author: "Cal Newport",
    category: "Focus",
  },
  {
    text: "Clarity about what matters provides clarity about what does not.",
    author: "Cal Newport",
    category: "Focus",
  },
  {
    text: "You do not rise to the level of your goals. You fall to the level of your systems.",
    author: "James Clear",
    category: "Focus",
  },
  {
    text: "Every action you take is a vote for the type of person you wish to become.",
    author: "James Clear",
    category: "Focus",
  },
  {
    text: "How we spend our days is, of course, how we spend our lives.",
    author: "Annie Dillard",
    category: "Focus",
  },
  {
    text: "A schedule defends from chaos and whim. It is a net for catching days.",
    author: "Annie Dillard",
    category: "Focus",
  },
  {
    text: "Learning how to think really means learning how to exercise some control over how and what you think.",
    author: "David Foster Wallace",
    category: "Focus",
  },
  {
    text: "All of humanity's problems stem from man's inability to sit quietly in a room alone.",
    author: "Blaise Pascal",
    category: "Focus",
  },
  {
    text: "It is not enough to be busy; so are the ants. The question is: what are we busy about?",
    author: "Henry David Thoreau",
    category: "Focus",
  },
  {
    text: "Things which matter most must never be at the mercy of things which matter least.",
    author: "Johann Wolfgang von Goethe",
    category: "Focus",
  },
  {
    text: "The successful warrior is the average man, with laser-like focus.",
    author: "Bruce Lee",
    category: "Focus",
  },
  {
    text: "The art of being wise is the art of knowing what to overlook.",
    author: "William James",
    category: "Focus",
  },
  {
    text: "Our life is frittered away by detail. Simplify, simplify.",
    author: "Henry David Thoreau",
    category: "Focus",
  },
  {
    text: "Simplicity is the ultimate sophistication.",
    author: "Leonardo da Vinci",
    category: "Focus",
  },

  // ─── Science ────────────────────────────────────────────────────────────────
  {
    text: "The first principle is that you must not fool yourself — and you are the easiest person to fool.",
    author: "Richard Feynman",
    category: "Science",
  },
  {
    text: "I would rather have questions that can't be answered than answers that can't be questioned.",
    author: "Richard Feynman",
    category: "Science",
  },
  {
    text: "We are a way for the cosmos to know itself.",
    author: "Carl Sagan",
    category: "Science",
  },
  {
    text: "The cosmos is within us. We are made of star-stuff.",
    author: "Carl Sagan",
    category: "Science",
  },
  {
    text: "The present is theirs; the future, for which I really worked, is mine.",
    author: "Nikola Tesla",
    category: "Science",
  },
  {
    text: "If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.",
    author: "Nikola Tesla",
    category: "Science",
  },
  {
    text: "That brain of mine is something more than merely mortal; as time will show.",
    author: "Ada Lovelace",
    category: "Science",
  },
  {
    text: "The more I study, the more insatiable do I feel my genius for it to be.",
    author: "Ada Lovelace",
    category: "Science",
  },
  {
    text: "Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.",
    author: "Albert Einstein",
    category: "Science",
  },
  {
    text: "The important thing is not to stop questioning. Curiosity has its own reason for existing.",
    author: "Albert Einstein",
    category: "Science",
  },
  {
    text: "Nothing in life is to be feared, it is only to be understood.",
    author: "Marie Curie",
    category: "Science",
  },
  {
    text: "Be less curious about people and more curious about ideas.",
    author: "Marie Curie",
    category: "Science",
  },
  {
    text: "If I have seen further than others, it is by standing upon the shoulders of giants.",
    author: "Isaac Newton",
    category: "Science",
  },
  {
    text: "Ignorance more frequently begets confidence than does knowledge.",
    author: "Charles Darwin",
    category: "Science",
  },

  // ─── Creativity ─────────────────────────────────────────────────────────────
  {
    text: "The creative adult is the child who has survived.",
    author: "Ursula K. Le Guin",
    category: "Creativity",
  },
  {
    text: "We read books to find out who we are.",
    author: "Ursula K. Le Guin",
    category: "Creativity",
  },
  {
    text: "The world always seems brighter when you've just made something that wasn't there before.",
    author: "Neil Gaiman",
    category: "Creativity",
  },
  {
    text: "You get ideas from daydreaming. You get ideas from being bored. You get ideas all the time.",
    author: "Neil Gaiman",
    category: "Creativity",
  },
  {
    text: "If there's a book that you want to read, but it hasn't been written yet, then you must write it.",
    author: "Toni Morrison",
    category: "Creativity",
  },
  {
    text: "We die. That may be the meaning of life. But we do language. That may be the measure of our lives.",
    author: "Toni Morrison",
    category: "Creativity",
  },
  {
    text: "If you only read the books that everyone else is reading, you can only think what everyone else is thinking.",
    author: "Haruki Murakami",
    category: "Creativity",
  },
  {
    text: "Pain is inevitable. Suffering is optional.",
    author: "Haruki Murakami",
    category: "Creativity",
  },
  {
    text: "Tell me, what is it you plan to do with your one wild and precious life?",
    author: "Mary Oliver",
    category: "Creativity",
  },
  {
    text: "Attention is the beginning of devotion.",
    author: "Mary Oliver",
    category: "Creativity",
  },
  {
    text: "You can't use up creativity. The more you use, the more you have.",
    author: "Maya Angelou",
    category: "Creativity",
  },
  {
    text: "There is no greater agony than bearing an untold story inside you.",
    author: "Maya Angelou",
    category: "Creativity",
  },
  {
    text: "I write entirely to find out what I'm thinking, what I'm looking at, what I see and what it means.",
    author: "Joan Didion",
    category: "Creativity",
  },
  {
    text: "We tell ourselves stories in order to live.",
    author: "Joan Didion",
    category: "Creativity",
  },

  // ─── Resilience ─────────────────────────────────────────────────────────────
  {
    text: "First forget inspiration. Habit is more dependable. Habit will sustain you whether you're inspired or not.",
    author: "Octavia Butler",
    category: "Resilience",
  },
  {
    text: "You don't start out writing good stuff. You start out writing crap and thinking it's good stuff, and then gradually you get better at it.",
    author: "Octavia Butler",
    category: "Resilience",
  },
  {
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
    category: "Resilience",
  },
  {
    text: "It's not what happens to you, but how you react to it that matters.",
    author: "Epictetus",
    category: "Resilience",
  },
  {
    text: "It is not because things are difficult that we do not dare; it is because we do not dare that things are difficult.",
    author: "Seneca",
    category: "Resilience",
  },
  {
    text: "When you come out of the storm, you won't be the same person who walked in. That's what the storm is all about.",
    author: "Haruki Murakami",
    category: "Resilience",
  },
  {
    text: "I can be changed by what happens to me. But I refuse to be reduced by it.",
    author: "Maya Angelou",
    category: "Resilience",
  },
  {
    text: "Someone I loved once gave me a box full of darkness. It took me years to understand that this too, was a gift.",
    author: "Mary Oliver",
    category: "Resilience",
  },
  {
    text: "It always seems impossible until it's done.",
    author: "Nelson Mandela",
    category: "Resilience",
  },
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill",
    category: "Resilience",
  },
  {
    text: "What doesn't kill me makes me stronger.",
    author: "Friedrich Nietzsche",
    category: "Resilience",
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
    category: "Resilience",
  },
  {
    text: "Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.",
    author: "Samuel Beckett",
    category: "Resilience",
  },
  {
    text: "I am not afraid of storms, for I am learning how to sail my ship.",
    author: "Louisa May Alcott",
    category: "Resilience",
  },
];
