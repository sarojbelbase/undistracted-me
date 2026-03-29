import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LockFill } from 'react-bootstrap-icons';

// 7 vibes — one picked randomly per overlay instance, independent of accent
const ORB_PALETTES = [
  '54,133,230',    // Blueberry
  '198,38,46',     // Strawberry
  '222,62,128',    // Bubblegum
  '165,109,226',   // Grape
  '243,115,41',    // Orange
  '40,188,163',    // Mint
  '207,162,94',    // Latte
];

// ─── Messages ────────────────────────────────────────────────────────────────

const MESSAGES = [
  // ── Look away / eyes ──────────────────────────────────────────────────────
  { title: 'Brief intermission', subtitle: "Look far away and let your eyes wander until we're back" },
  { title: 'Rest your eyes', subtitle: 'Find a point 20 feet away and let your gaze soften naturally' },
  { title: 'Exhale slowly', subtitle: 'Step away from the screen — breathe, then return' },
  { title: 'Take a moment', subtitle: 'Look out the window and let the distance find you' },
  { title: 'Stare into the void', subtitle: 'Not the terminal. An actual horizon. Outside.' },
  { title: 'Eyes on the horizon', subtitle: 'Find something 20 feet away. Do not describe it in a PR comment.' },
  { title: 'Blink. Actually blink.', subtitle: 'You have been forgetting. Your eyes sent a complaint.' },
  { title: 'Look far away', subtitle: 'Like you are trying to see free time in the distance' },
  { title: 'Your corneas called', subtitle: 'They said "thanks for the blue light, but no thanks." Time to look elsewhere.' },
  { title: 'Defocus intentionally', subtitle: 'Blur the world for 20 seconds. No glasses required.' },
  { title: 'The 20-20-20 rule', subtitle: 'Every 20 minutes, look 20 feet away for 20 seconds. This is that 20 seconds. You are doing it right now.' },
  { title: 'Look up', subtitle: 'At the ceiling. Actually look. Most people never properly look at the ceiling. Something might be up there.' },
  { title: 'Find something yellow', subtitle: 'In this room. Right now. Do not move. Just scan. Find it. Eyes are more aware now.' },
  { title: 'Look for something circular', subtitle: 'In your environment right now. Then square. Then triangular. Geometry scavenger hunt. Eyes: refreshed.' },

  // ── Drink water / coffee ──────────────────────────────────────────────────
  { title: 'Drink water', subtitle: 'Not coffee. Not energy drink. Water. The original beverage.' },
  { title: 'Refill your coffee', subtitle: "If it's been cold for an hour, you're not drinking it. You're hoarding it." },
  { title: 'Hydration check', subtitle: 'When did you last drink water? If you are not sure, the answer is "too long ago".' },
  { title: 'Your mug is empty', subtitle: 'We cannot confirm this, but statistically, it probably is. Go look.' },
  { title: 'Tea? Coffee? Water?', subtitle: 'Pick one. Walk to it. Drink it. Revolutionary productivity hack.' },
  { title: 'Refill something', subtitle: "Your water bottle, your coffee mug, your will to continue — dealer's choice." },
  { title: 'Cold coffee alert', subtitle: 'Science says reheating it three times changes the flavor. Prove science wrong.' },
  { title: 'Drink more water', subtitle: 'Your brain is 75% water and currently filing a shortage report.' },
  { title: 'Go make a hot drink', subtitle: 'The walk to the kitchen is also a stretch. Two birds, one mug.' },
  { title: 'Chug some agua', subtitle: 'Not a suggestion. A biological requirement. Go. Now. We will wait.' },

  // ── Stretch ───────────────────────────────────────────────────────────────
  { title: 'Stretch your neck', subtitle: 'Tilt left. Tilt right. Your spine is filing a class action lawsuit.' },
  { title: 'Stand up', subtitle: 'Just stand. That is the full exercise. Congratulations on doing fitness.' },
  { title: 'Roll your shoulders', subtitle: 'Backwards. Forwards. Realize how tight they are. Feel shame, then relief.' },
  { title: 'Touch your toes', subtitle: "Or your knees. Or just wave at them from a distance. Stretch however far you get." },
  { title: 'Wrist stretch time', subtitle: 'Extend one arm, pull fingers back gently. Your joints say thank you.' },
  { title: 'Do a full body stretch', subtitle: 'Arms up, back arched, yawn loudly. Own it. You deserve the full dramatic version.' },
  { title: 'Walk in a small circle', subtitle: "Your step count currently says 47. Let's get to 50 at least." },
  { title: 'Ankle circles', subtitle: "Rotate both ankles. You've been sitting so long they forgot they could move." },
  { title: 'Hip flexors are suffering', subtitle: 'Stand up. Do a slow lunge. Hear the complaints from your lower body.' },
  { title: 'Chin tucks', subtitle: 'Push your chin straight back. Hold. Feel ridiculous but righteous.' },
  { title: 'Stretch your fingers', subtitle: 'Spread them wide. Fan them out. They have been hunched over keys for hours.' },
  { title: 'Lower back stretch', subtitle: 'Sit tall, twist gently left then right. Your lumbar disc will write you a thank you note.' },
  { title: 'Calf raises', subtitle: 'Stand on your toes. Hold for 5 seconds. Repeat twice. Your calves are begging.' },
  { title: 'Stand on one leg', subtitle: "20 seconds. Balance challenge. If you wobble, you need to do more single-leg stands. If you don't, good for you." },
  { title: 'Shrug intensely', subtitle: 'Shrug both shoulders up toward your ears as hard as you can. Hold 5 seconds. Drop. Feel that release.' },
  { title: 'Open your chest', subtitle: 'Clasp hands behind your back, push chest forward. The opposite of everything you do at a desk.' },
  { title: 'The doorframe stretch', subtitle: 'If near a doorframe: arms up, lean through. Your pectoral muscles have been closed for business too long.' },

  // ── Talk to a coworker ────────────────────────────────────────────────────
  { title: 'Ask a coworker', subtitle: "What did they have for dinner last night? Be genuinely curious. Don't fake it." },
  { title: 'Social challenge', subtitle: "Find someone nearby and ask: What's your favourite animal? Then genuinely argue about it." },
  { title: 'Start a conversation', subtitle: "Ask your nearest coworker: reptile or mammal? This will go somewhere interesting." },
  { title: 'Office recon mission', subtitle: "Walk to someone's desk and ask what side project they are secretly building. Listen for 20 seconds." },
  { title: 'Team trivia', subtitle: 'Ask someone: what is the capital of Mongolia? First person to say Ulaanbaatar wins respect.' },
  { title: 'Coworker survey', subtitle: "Ask three people: pineapple on pizza — yes or no? Document results. Report back." },
  { title: 'The classic opener', subtitle: 'Go ask a coworker what they are working on. Actually care about the answer.' },
  { title: 'Settle a debate', subtitle: "Ask someone: tabs or spaces? Then walk away before the argument escalates." },
  { title: 'Share a fact', subtitle: 'Tell a coworker that a day on Venus is longer than a year on Venus. Walk away slowly.' },
  { title: 'Pet update request', subtitle: "Ask anyone nearby: do you have a pet? If yes, ask to see a photo. This is always worth it." },
  { title: 'Weekend plans intelligence', subtitle: "It's Wednesday and you have no idea what anyone around you does outside of this building. Ask." },
  { title: 'The best question', subtitle: "'If you could only eat one food for the rest of your life?' Ask it. Argue about it. Bond over it." },
  { title: 'Ask about their side project', subtitle: 'Every developer has one. Find the nearest one and ask. Be ready to hear a pitch.' },
  { title: 'Favourite reptile challenge', subtitle: 'Ask a coworker: snake, lizard, or turtle? Nobody ever gets asked this. It will make their day.' },
  { title: 'The hypothetical swap', subtitle: "Ask someone: if you could swap jobs with anyone for one day, who would it be? Answers are revealing." },
  { title: 'Childhood game recall', subtitle: 'Ask someone what their favourite game was before age 10. You will both feel better in 30 seconds.' },
  { title: 'Best meal this week', subtitle: "Ask the nearest person: what was the best thing you ate this week? You might find a great restaurant recommendation." },
  { title: 'Find someone who is doing well', subtitle: "Ask 'what's going well for you lately?' instead of 'how are you?' The answers are completely different." },
  { title: 'The animal debate', subtitle: "Ask a coworker: if you were any animal, what would you be and why? This never gets old." },
  { title: 'Compliment someone', subtitle: 'Find something genuine to say to whoever is nearest. Something specific. Generic compliments bounce off. Specific ones land.' },

  // ── Contact a distant friend ──────────────────────────────────────────────
  { title: 'Text that friend', subtitle: "You know the one. You keep meaning to message them. The message can literally just be 'hey'." },
  { title: 'Call someone you miss', subtitle: 'Not a meeting. Not a standup. An actual phone call to a human you like.' },
  { title: 'Long distance check-in', subtitle: "There's someone out there wondering if you're still alive. 20 seconds for a text to confirm yes." },
  { title: 'Message your old college friend', subtitle: "The one you said 'let's hang soon' to in 2019. Hang soon." },
  { title: 'The meme duty', subtitle: 'Find one funny thing online in the next 20 seconds and send it to a friend. Relationship maintained.' },
  { title: 'Reply to that message', subtitle: "There is a 94% probability you have an unread message you meant to reply to 'later'. It is later." },
  { title: 'Call your parents', subtitle: 'If you have not called in more than a week, this is your sign. Use it.' },
  { title: 'The voice note option', subtitle: "Send someone a voice note. Not a text. A voice. They will appreciate hearing your voice more than you expect." },

  // ── Check on your plant ───────────────────────────────────────────────────
  { title: 'Check your plant', subtitle: 'Is the soil dry? Does it look sad? Water it. Or just acknowledge it exists. Plants need validation too.' },
  { title: 'Plant status report', subtitle: 'Walk to any plant within 10 metres. Touch the soil. React accordingly.' },
  { title: 'Your succulent is fine', subtitle: "Actually, you should check. Succulents are fine until suddenly they are not. Go look." },
  { title: 'Water your plant', subtitle: 'If you do not have a plant, use this time to consider getting one. They improve air quality and also your reputation.' },
  { title: 'The plant monitor', subtitle: 'Go assess the plant situation. Yellow leaves? Overwatered. Droopy? Underwatered. You have this.' },
  { title: 'Mist the leaves', subtitle: "Most houseplants love a light misting. If you have a spray bottle, go use it. Your plant's face will light up. Metaphorically." },

  // ── Clip nails / personal ─────────────────────────────────────────────────
  { title: 'Nail check', subtitle: 'Look at your fingernails right now. If you heard a click while typing this morning, it is time.' },
  { title: 'Clip your nails', subtitle: "Not at your desk. Please. Go somewhere. It is polite. And your keyboard will thank you." },
  { title: 'Quick hygiene audit', subtitle: 'Is your hair doing something unexpected? Check. 20 seconds in a reflective surface fixes everything.' },
  { title: 'Wash your hands', subtitle: 'You touched your phone since the last time. Wash them. The sink is right there.' },

  // ── Mental challenges ─────────────────────────────────────────────────────
  { title: 'Count backwards from 100', subtitle: '100, 99, 98 ... say it out loud. By 70 you will feel oddly calm. It is a genuine trick.' },
  { title: 'Name 10 countries starting with M', subtitle: 'Go. No Google. Mexico, Morocco, Mongolia... it gets hard around 7.' },
  { title: 'List the prime numbers', subtitle: 'Start from 2. Go as far as you can. 2, 3, 5, 7, 11, 13 ... see how high you get.' },
  { title: 'Recite the periodic table', subtitle: 'H, He, Li, Be, B, C, N, O, F, Ne ... Just the first 10. Pretend you are Walter White.' },
  { title: 'Name all 7 dwarfs', subtitle: "Happy, Grumpy, Sleepy, Bashful, Sneezy, Dopey, and... the one everyone forgets is Doc." },
  { title: 'The capitals challenge', subtitle: 'Name 5 capital cities you could not locate on a map if your life depended on it. Contemplate.' },
  { title: 'Planets in order', subtitle: 'Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune. Now do it in size order. Different!' },
  { title: 'Name 5 bones', subtitle: 'Not femur. Not skull. Anyone can do those. Go obscure. Phalanges. Clavicle. Olecranon. Sounding medical yet?' },
  { title: 'The 50 states challenge', subtitle: 'See how many US states you can name in 20 seconds. Nobody ever gets all 50 the first try.' },
  { title: 'Rainbow order plus one', subtitle: "Red, orange, yellow, green, blue, indigo, violet. Now name a thing for each colour starting with that letter." },
  { title: 'Five senses check', subtitle: 'Name one thing you can: see, hear, feel, smell, and taste right now. Mindfulness: done.' },
  { title: 'Memory palace warmup', subtitle: "Think of your childhood home's front door. Walk through it in your mind. Name 5 things you see." },
  { title: 'Mental maths: 17 × 8', subtitle: 'In your head. No calculator. You can do this. (The answer is 136. Did you get it?)' },
  { title: 'Name 10 fruits', subtitle: 'Not apple, not banana, not orange — everyone starts there and runs out of ideas. Go exotic.' },
  { title: 'Periodic table challenge', subtitle: 'What element is Au? What about Fe? Pb? W? If you got W (tungsten) without help, you are officially a nerd. Welcome.' },
  { title: 'List programming languages', subtitle: 'How many can you name in 20 seconds? Bonus point for naming one nobody has used since 2003.' },
  { title: 'The Fibonacci sequence', subtitle: '1, 1, 2, 3, 5, 8, 13, 21, 34, 55 ... see how far you can go from memory.' },
  { title: 'Name 5 philosophers', subtitle: 'And one thing each of them believed. Aristotle does not count unless you know his actual views.' },
  { title: 'Silent alphabet countries', subtitle: 'Go through the alphabet in your head. For each letter, name a country that starts with it. X is a trap.' },
  { title: 'Name the continents', subtitle: 'All 7. Bonus round: by area, smallest to largest. (Hint: Australia/Oceania is smallest. Asia is largest.)' },
  { title: 'Square root challenge', subtitle: 'Square root of 144? 12. Square root of 225? 15. Square root of 1764? ... It is 42.' },
  { title: 'The rule of 72', subtitle: "Divide 72 by your interest rate to find how many years to double your money. The thing no one taught you in school." },
  { title: 'Name a historical event from 100 years ago', subtitle: '1926. What happened? Anything? More than you think. History is always happening right now too.' },
  { title: 'The inventor test', subtitle: "Who invented the telephone? Easy. Who invented the USB? Almost nobody knows. (It was Ajay Bhatt.)" },
  { title: "2 to the power of 10", subtitle: "1024. Now do 2 to the 12. 4096. Now 2 to the 16. 65536. If you knew that, you are definitely a developer." },
  { title: 'Name 5 types of cheese', subtitle: 'Not cheddar, mozzarella, and parmesan three times with different names. Real distinct cheeses. Go.' },
  { title: 'The alphabet backwards', subtitle: 'Z, Y, X, W ... most people get lost around N. How far can you go without looking it up?' },
  { title: 'Name all Seven Wonders', subtitle: 'The ancient ones OR the modern ones. Not both. Just pick a list and complete it.' },
  { title: 'Name 10 vegetables starting from Z', subtitle: 'Zucchini... now good luck. This is deliberately cruel and we apologize.' },
  { title: 'Name 4 countries that border Germany', subtitle: 'There are actually 9. Can you name all of them? Bonus: can you do it for France?' },
  { title: 'Speed of light?', subtitle: '299,792,458 metres per second. In a vacuum. Now tell someone this fact today for absolutely no reason.' },
  { title: 'What is your blood type?', subtitle: "Roughly half of people do not know. Do you? If not, today is a good day to find out. Seriously." },
  { title: 'Longest word you know', subtitle: "Can you spell 'pneumonoultramicroscopicsilicovolcanoconiosis'? That is the full game." },
  { title: 'Name the Avengers', subtitle: 'The original six are easy. The harder question is: how many total? (It is around 70. Good luck.)' },
  { title: 'Name a song from the year you were born', subtitle: 'Without Googling. Think. The year exists in the music.' },
  { title: 'What time is sunrise tomorrow?', subtitle: 'Guess first. Then check after. Noticing the sun is a free daily event most people opt out of.' },
  { title: 'Count ceiling tiles', subtitle: 'Or floor tiles. Or bricks in the wall. Counting is meditative. Architects approve this message.' },
  { title: 'What continent are you closest to?', subtitle: 'Not the one you are on. The nearest other one. Geography is surprising.' },
  { title: 'Name 5 types of pasta', subtitle: 'Spaghetti is free. Penne is free. Now find three more specific ones. No cheating with "the flat wide one".' },
  { title: 'Hum a national anthem', subtitle: 'Any country. Not your own. See how far you get before you realize you only know the first 4 bars.' },

  // ── Funny / absurd ────────────────────────────────────────────────────────
  { title: 'Stare at your hands', subtitle: "They're doing so much for you and you barely acknowledge them. Look at them. Really look." },
  { title: 'Practice your signature', subtitle: 'When did you last write it? Is it good? Could it be better? This is 20 seconds of self-improvement.' },
  { title: 'Whisper your own name', subtitle: 'Just once. Quietly. To see how it sounds. This is not weird. This is grounding.' },
  { title: 'Make a face', subtitle: 'No one is judging. Stretch your facial muscles. Scrunch nose, pop eyes wide, big fake smile. Reset.' },
  { title: 'Spin your chair', subtitle: "If you don't have a spinning chair, this is the moment you realize the oversight. Time to advocate for one." },
  { title: 'Smell something', subtitle: 'Your coffee. Your hand. A plant. The air. Use the nose. It does more than sit on your face.' },
  { title: 'Tidy one thing', subtitle: 'Just one. Straighten one cable. Move one mug. Stack one paper. Micro-tidiness is real tidiness.' },
  { title: 'Rate your chair', subtitle: 'On a scale of 1-10, how is your chair treating you? If under 7, it is time to have a conversation with facilities.' },
  { title: 'Recall your dreams', subtitle: "You had one last night. What was in it? You have 20 seconds before it evaporates completely." },
  { title: 'Write tomorrow\'s to-do list', subtitle: 'Not today. Not now. Tomorrow. Name three things for tomorrow. Then let today breathe.' },
  { title: 'Balance a pen on your lip', subtitle: 'Balance a pen on your upper lip. How long can you hold it? This is a legitimate brain break.' },
  { title: 'Box breathe', subtitle: 'Breathe in for 4 counts. Hold for 4. Out for 4. Hold for 4. Repeat once. That was box breathing. You did it.' },
  { title: 'Rate your lunch today', subtitle: 'Did it deserve a Michelin star? Was it "I had leftovers"? Honest self-reflection.' },
  { title: 'Name your last 5 commits', subtitle: "If more than two were 'fix', 'update', or 'wip' — consider this a nudge toward descriptive messages." },
  { title: 'Open a window', subtitle: 'Or at least look at one. Fresh air is still a thing. It works.' },
  { title: 'The font quiz', subtitle: 'Sans-serif or serif? Which would you choose for a tattoo? Think about it. This matters.' },
  { title: 'Name a bird', subtitle: 'Not a penguin. Not an eagle. Something regional and specific. Look up "birds near me" after.' },
  { title: 'Think of a joke', subtitle: "You have 20 seconds. A real one. Not a pun. If it is a pun, it still counts but you must groan after." },
  { title: 'High five yourself', subtitle: 'Both hands. Over the head. You have been doing a great job and no one has high-fived you today.' },
  { title: 'Do a silent victory dance', subtitle: "No music. No noise. Just you, your chair, and a small internal celebration for still being here." },
  { title: 'Wipe down your keyboard', subtitle: "It hasn't complained once. It handles everything you throw at it. Give it a little clean." },
  { title: 'Describe yourself in 6 words', subtitle: "How would you describe yourself in exactly 6 words? 20 seconds. Go. This is now a brand exercise." },
  { title: 'Who was your first best friend?', subtitle: 'Think of them. Remember one specific memory. Smile slightly. Continue.' },
  { title: 'Name three good things', subtitle: "That happened today. Not 'nothing bad happened' — actual good things. There were some. Find them." },
  { title: 'The one cuisine forever question', subtitle: 'If you had to eat only one cuisine for a year, what would it be? Wrong answers only. Then also the right one.' },
  { title: "Pretend you're narrated", subtitle: "Narrate your surroundings in David Attenborough's voice. Just in your head. You have 20 seconds." },
  { title: 'The 5-4-3-2-1 reset', subtitle: '5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste. Instant mindfulness.' },
  { title: 'Name every teacher you remember', subtitle: 'Start from kindergarten. Go in order. See how far you get. Notice who appears first.' },
  { title: 'Guess the exact time', subtitle: "Don't look at the clock. Guess what time it is. Commit to a number. Then look. Your internal clock will shock you." },
  { title: 'Recite your address', subtitle: "Full postal address, out loud, quietly. When is the last time you needed to tell someone it?" },
  { title: 'What is your backup career?', subtitle: "If not this, what? Architect? Baker? Competitive napper? You have 20 seconds to commit to a second calling." },
  { title: 'Close your eyes fully', subtitle: 'For 20 seconds. Actually close them. Not almost closed. Really closed. Rest mode: on.' },
  { title: 'Desk drawer inventory', subtitle: 'What is in your desk drawer that you have not touched in over 6 months? We all have that thing.' },
  { title: 'List the last 5 movies you watched', subtitle: "Can you? Without IMDb? People think they remember more films than they actually do. Test it." },
  { title: 'Your zombie apocalypse team', subtitle: 'One person. Right now. That is your team. Choose wisely.' },
  { title: 'Name a superpower you would not want', subtitle: "Hearing everyone's thoughts is the obvious bad one. There are worse. Think." },
  { title: 'Superpower: flight or invisibility?', subtitle: "Flight vs. invisibility is the classic. But what's your actual answer and why? (Time travel is not on the list.)" },
  { title: 'Write your name in the air', subtitle: "With your other hand. Now. Looks terrible. That's fine. That's the point." },
  { title: 'List 5 things that made you laugh recently', subtitle: "If you cannot name five, your media diet needs emergency attention. Time to find funny things." },
  { title: 'The colour of your first car', subtitle: "Or your parents' first car. Where did that memory come from?" },
  { title: 'Hum something', subtitle: 'Any song. Quietly. The first one that comes to mind. You did not expect to be humming right now, did you?' },
  { title: 'Pick a number 1–100', subtitle: "Is it 37? People almost always pick 37 when asked for a random number. It is not random. Nothing is." },
  { title: 'A food you have never tried', subtitle: "Name one. Specific. Not just 'some weird fruit.' A real dish. Then go find where to get it." },
  { title: "Close your unused tabs", subtitle: "Not all of them. Just the ones you opened 'to read later' 3 months ago. They're not coming back." },
  { title: 'What would you do with one free hour today?', subtitle: "Not ideally. Right now, today, after work. What would it be? Is that possible? Make it happen." },
  { title: 'The silence experiment', subtitle: 'No music, no notifications, no typing for 20 seconds. Just ambient sound. What do you hear?' },
  { title: 'Name 5 flowers', subtitle: "Without rose and tulip. Those are too easy. Go deeper. Dahlia. Protea. Wisteria. Magnolia. Now you." },
  { title: 'The colour of your front door growing up', subtitle: "What colour was the front door of the place you grew up? Weird how specific memory can be about irrelevant details." },
  { title: 'Smile at no one', subtitle: "Just smile. Slightly. No reason. For 20 seconds. Your brain cannot tell the difference and releases dopamine anyway." },
  { title: 'The recurring dream', subtitle: "The one you keep having. What happens in it? Is it the same each time or slightly different?" },
  { title: 'Name something getting better in the world', subtitle: "One thing. Measurably, genuinely improving globally. It exists. Find it. Hold it for a moment." },
  { title: 'The best advice you ever received', subtitle: "From anyone. 20 seconds to name it and the person who said it. Then carry it back in with you." },
  { title: 'Clap once', subtitle: 'Just once. Loudly. Then sit in the slight social awkwardness you just created. You made something happen.' },
  { title: 'Your oldest hobby', subtitle: "The first thing you were into before screens existed. Do you still do it? Should you?" },
  { title: 'Something you want to learn', subtitle: "Not related to work. A skill, a language, an instrument, a recipe. Name it. Say it out loud. Now it is more real." },
  { title: 'Deep breath audit', subtitle: 'Shoulders up on inhale, drop hard on exhale. Feel the difference. That is tension leaving. It works.' },
  { title: 'Say something kind to yourself', subtitle: "Out loud, or in your head. Something you would say to a friend. You are allowed to receive the same kindness." },
  { title: 'The compliment mission', subtitle: 'Think of a genuine compliment for someone near you. Optional: say it out loud. Guaranteed good outcome.' },
  { title: 'What would your younger self think?', subtitle: "Excited? Surprised? Disappointed you don't have a jetpack yet? Be honest. Be kind." },
  { title: 'Rate your posture right now', subtitle: "1 to 10. Before you adjusted it just now. What was it? (We saw you sit up straighter.)" },
  { title: 'The thank you you have not said', subtitle: "Someone helped you recently and you did not fully thank them. You know who. A message takes 20 seconds." },
  { title: 'Name a word with no English translation', subtitle: "'Saudade', 'Mamihlapinatapai', 'Hiraeth' — words that exist because one culture felt that specific thing." },
  { title: 'The perfect weekend morning', subtitle: "Describe it. Weather, food, activity, location. 20 seconds. Now figure out which part you could have this weekend." },
  { title: 'Three things you are proud of', subtitle: "Not work achievements. Personal ones. Who you are, not what you made." },
  { title: 'What is your favourite number?', subtitle: "And why? There is always a reason. You have had it since childhood. Dig for it." },
  { title: 'The invention that changed your daily life', subtitle: "Not the internet or the phone. Something specific and mundane. Like the alarm clock. Or the zipper." },
  { title: 'Where would you retire?', subtitle: "Mountains? Beach? City? Another country entirely? You have 20 seconds. That is enough time to pick a dream." },
  { title: 'List your top 3 apps honestly', subtitle: "The ones you actually use, not the ones you tell people you use. Honesty is the first step." },
  { title: 'Do nothing', subtitle: "Truly nothing. Resisting the urge to be productive is the task. Sit. Do not think about work. Just exist." },
  { title: 'Recall 3 things you are proud of', subtitle: "Not your work achievements. Personal ones. Who you are, not what you made." },
  { title: 'The awkward silence test', subtitle: "How long can you sit in complete silence? Do it now. 20 seconds. It is harder and more comfortable than expected." },
  { title: 'What was the last gift you gave?', subtitle: "Think about it. Remember their face when they got it. That was you being a good person. Well done." },
  { title: 'The kindness audit', subtitle: "Have you done one genuinely kind thing today? Not work-kind. Human-kind. Still time if not." },
  { title: 'The oldest building near you', subtitle: "When was it built? Who built it? What was here before it? Buildings have good backstories." },
  { title: 'The age game', subtitle: "How old is the oldest person you know personally? What was the world like when they grew up?" },
  { title: 'The noise audit', subtitle: 'What can you hear right now? List three sounds you normally filter out. Listening: enabled.' },
  { title: 'A film you want to watch tonight', subtitle: "You have probably been 'meaning to watch' something for 3 months. Name it. Tonight might be the night." },
  { title: 'Locate the exit', subtitle: "Not an escape plan. Just. Good to know where the door is. Awareness. Grounding. That's all." },
  { title: 'What is the most useful thing you learned this month?', subtitle: "One thing. Work or life. If you cannot name one: this break is your warning." },
  { title: 'Two truths and a lie', subtitle: "About yourself. Right now. Just in your head. If you want to test them on someone later, even better." },
  { title: 'The "what if" question', subtitle: "'What if I had taken that other job?' Think it fully. Feel it. Then come back. This one is yours to live." },
  { title: 'Someone who inspired you', subtitle: "Name one person — teacher, family, stranger, fictional character — who changed how you see things." },
  { title: 'The one you keep putting off', subtitle: "There's a task sitting somewhere that you have been avoiding. You know which one. It probably takes 10 minutes." },
  { title: 'The time zone challenge', subtitle: "When it's noon here, what time is it in Tokyo? New York? São Paulo? You should probably know at least one of these." },
  { title: 'Step outside', subtitle: "If logistically possible: walk outside for 20 seconds. Feel the temperature. Confirm the planet still exists." },
  { title: 'What would you eat anywhere tonight?', subtitle: "Anywhere in the world. One restaurant. You have 20 seconds. Commit." },
  { title: 'Your comfort meal', subtitle: "Not your favourite. Your comfort. The meal that means safety. Think of it. Plan to make it this week." },

  // ── More look away / mindful ───────────────────────────────────────────────
  { title: 'Soft gaze', subtitle: 'Unfocus your eyes completely. Let everything blur. Your brain does not need sharp edges right now.' },
  { title: 'Scan the room slowly', subtitle: 'Left to right. Corner to corner. Like a security camera but with more empathy.' },
  { title: 'Notice the light', subtitle: 'Where is it coming from? Natural or artificial? Warm or cool? You have never looked this carefully.' },
  { title: 'Watch something move', subtitle: 'A tree branch, a curtain, dust in a sunbeam. Moving things are restful. Screens are not moving. This is.' },
  { title: 'Eyes: 30 rapid blinks', subtitle: 'As fast as you can. It feels ridiculous. It lubricates your eyes. Best 5 seconds you will spend today.' },
  { title: 'Look at the sky', subtitle: 'Through any available window. For 20 seconds. Clouds are free and underrated.' },
  { title: 'Find something that is two colours', subtitle: 'In this room. Right now. Eyes scanning. Pattern recognition: on.' },
  { title: 'Palming', subtitle: 'Rub your palms together until warm. Cup them over your closed eyes. Darkness + warmth. Eyes: relieved.' },

  // ── More hydration ─────────────────────────────────────────────────────────
  { title: 'Snack check', subtitle: "When did you last eat? If it was more than 4 hours ago, your brain is running on ambition alone. Go fix that." },
  { title: 'The electrolyte moment', subtitle: 'Water is good. Water with a pinch of salt is better for hydration. This is real science. Go experiment.' },
  { title: 'Herbal tea somebody?', subtitle: "Chamomile. Peppermint. Ginger. You have options beyond caffeine. The kettle is right there." },
  { title: 'Second cup check', subtitle: "Is this your third coffee? Be honest. You know the answer. Consider water instead. Hydration over stimulation." },
  { title: 'Sparkling water audit', subtitle: "Do you have sparkling water? That feels fancy. Do it. You deserve bubbles." },
  { title: 'Fruit instead of snack', subtitle: "There is probably a banana somewhere near you that has been waiting patiently. Today is its day." },

  // ── More stretches ─────────────────────────────────────────────────────────
  { title: 'Ear to shoulder stretch', subtitle: 'Right ear toward right shoulder. Hold 10. Switch. The creak you hear is your neck saying "finally".' },
  { title: 'Seated pigeon pose', subtitle: 'Ankle on opposite knee. Lean forward slightly. Your hips have not experienced this much attention in weeks.' },
  { title: 'Forearm stretch', subtitle: 'Arms out, palms up. Gently press each hand down with the other. Programmers need this more than anyone.' },
  { title: 'The invisible keyboard stretch', subtitle: 'Type on nothing. In the air. As wide and far-reaching as possible. Biggest keyboard you have ever used.' },
  { title: 'Side bend', subtitle: 'One arm up, lean to the opposite side. Hold for 8. Switch. The obliques appreciate any attention they get.' },
  { title: 'March on the spot', subtitle: '20 seconds. Knees up high. Arms pumping. You look ridiculous and your circulation loves it.' },
  { title: 'Wrist circles', subtitle: 'Both wrists. Slow full circles each direction. They carry you through thousands of keystrokes. Honour them.' },
  { title: 'The wall push', subtitle: 'Find a wall. Arms out. Lean in slightly. Hold. This is a legitimate stretch. Trust the wall.' },
  { title: 'Jaw stretch', subtitle: "You clench your jaw when you think. You know you do. Open wide, hold, release. Your dentist will notice." },
  { title: 'Eye socket massage', subtitle: 'Gently press the bone above and below each eye. Not the eyeball. The bone. Strangely satisfying.' },
  { title: 'Seated twist', subtitle: 'Hand on opposite knee, look behind you. Hold 10 each side. Your thoracic spine has been screaming quietly.' },
  { title: 'Forehead smooth', subtitle: 'Use two fingers to smooth out your forehead. Go slow. The furrow between your brows is a tension log.' },

  // ── More coworker challenges ───────────────────────────────────────────────
  { title: 'Ask: what song is in your head?', subtitle: "Whatever is stuck in their head, it will now be in yours too. Community building through mutual suffering." },
  { title: 'The desert island disc challenge', subtitle: "Ask someone: one album, forever, desert island. Watch them visibly struggle. Then tell them yours." },
  { title: 'Pitch your coworker\'s startup', subtitle: 'Ask someone what their startup idea is. Everyone has one. Every single person. Ask.' },
  { title: 'The most niche skill challenge', subtitle: 'Ask someone: what is the most specific useless skill you have? Be ready for a surprisingly good answer.' },
  { title: 'Ask about their hometown', subtitle: "Ask someone where they grew up and what's one thing people always get wrong about that place." },
  { title: 'The pronunciation debate', subtitle: "Ask someone: GIF or JIF? Do not take sides publicly. Just observe the chaos you created." },
  { title: 'Book recommendation request', subtitle: "Ask a coworker: what is the last book you actually finished? People love being asked this. Do it." },
  { title: 'Ask about their commute', subtitle: "How do they get here? How long? What do they listen to? Commutes reveal character." },
  { title: 'The hidden talent reveal', subtitle: "Ask: what can you do that surprises people when they find out? You will be shocked by the answers." },
  { title: 'Worst job ever', subtitle: "Ask someone: what was your worst job before this one? The stories are always either hilarious or educational." },
  { title: 'The strong opinion survey', subtitle: "Ask: what is something most people think is fine that you absolutely cannot stand? Harmless but interesting." },
  { title: 'Childhood hero question', subtitle: "Ask someone who their childhood hero was. Not a celebrity. An actual hero. A real one." },
  { title: 'The morning routine ask', subtitle: "Do they check their phone first? Make coffee? Meditate? Run? Morning routines expose priorities beautifully." },
  { title: 'Ask their dream travel destination', subtitle: "Not where they have been. Where they actually want to go but have not been yet. Then ask why." },
  { title: 'The most played song ask', subtitle: "Ask someone: what is the most-played song in your library? There is no wrong answer. Only revealing ones." },
  { title: 'Collect a fun fact', subtitle: "Ask anyone near you for a fun fact. They will be delighted. You will learn something. Win-win." },

  // ── More distant friend ────────────────────────────────────────────────────
  { title: 'Schedule a call', subtitle: "Not 'we should catch up'. An actual date in a calendar. With a person. For a phone call. Do it now, in 20 seconds." },
  { title: 'Send a photo memory', subtitle: "Find a photo of you and someone you miss. Send it to them with no context. They will love it." },
  { title: 'The birthday check', subtitle: "When is the next birthday of someone you care about? Do you have something planned? You have 20 seconds to start." },
  { title: 'Write a note you will never send', subtitle: "To anyone. About anything. It does not have to be delivered to be meaningful. Start it in your head." },
  { title: 'Reconnect with someone you lost touch with', subtitle: "One name. You know who. A single message. After a year or five years, the message is still always welcome." },
  { title: 'Send encouragement', subtitle: "Think of someone who is going through something hard right now. A single 'thinking of you' text changes a day." },

  // ── More plant / nature ────────────────────────────────────────────────────
  { title: 'Adopt a plant mentally', subtitle: "If you do not have a plant, name one in your building. It is now your plant. Check on it today." },
  { title: 'Open the blinds', subtitle: "More light. More vitamin D. More good mood. You have been sitting in artificial light for too long." },
  { title: 'Notice something alive outside', subtitle: "A bird, a tree, a dog being walked. Find it. Watch it for 10 seconds. Life is happening out there." },
  { title: 'The air quality question', subtitle: "When did you last breathe genuinely fresh air? Not near a road. Actual fresh air. Go recalibrate." },
  { title: 'Fertilise your ambitions', subtitle: "Or your plant. Both need periodic feeding. The metaphor is free. The fertiliser costs extra." },

  // ── More personal ─────────────────────────────────────────────────────────
  { title: 'Posture reset', subtitle: "Sit up. Shoulders back. Chin neutral. Feet flat. You had fully melted into your chair. Welcome back." },
  { title: 'Face wash break', subtitle: "If you can: splash cold water on your face. The reset is immediate. Like ctrl+alt+delete but for your head." },
  { title: 'Lip balm check', subtitle: "Do your lips need some? There is probably a tube somewhere near you that has been waiting. Use it." },
  { title: 'Phone screen clean', subtitle: "Your phone screen has a level of biological diversity that scientists would find interesting. Wipe it." },
  { title: 'Check your notifications later', subtitle: "You were just about to check your phone. That was not this break's assignment. Look far away." },
  { title: 'Glasses clean', subtitle: "If you wear glasses: when did you last clean them? Right now. With a proper cloth. The world becomes crisper." },
  { title: 'Shoes off for a moment', subtitle: "If you are wearing tight shoes: take them off for 20 seconds. Your feet have been politely suffering." },
  { title: 'Loosen your watch or bracelet', subtitle: "Has it been tight all day? Loosen it for a minute. Your wrist will remember what blood flow feels like." },

  // ── More mental challenges ─────────────────────────────────────────────────
  { title: 'Binary to decimal', subtitle: "What is 1010 in decimal? 10. What is 11111111? 255. What is 10000000? 128. You know this. You are a developer." },
  { title: 'Memorise a phone number', subtitle: "Pick someone important to you. Memorise their number. If your phone dies, you want this in your head." },
  { title: 'Recall the OSI model', subtitle: "Physical, Data Link, Network, Transport, Session, Presentation, Application. Or backwards. Both count." },
  { title: 'Name 5 sorting algorithms', subtitle: "Bubble, merge, quick — everyone gets those. What are the other two? Selection? Heap? Radix? Think." },
  { title: 'HTTP status codes quiz', subtitle: "200, 201, 301, 302, 400, 401, 403, 404, 429, 500, 503. Can you name what each one means from memory?" },
  { title: 'Name the Git commands you use most', subtitle: "Now name three you almost never use but should probably learn. That is today's homework." },
  { title: 'The design patterns challenge', subtitle: "Singleton, Factory, Observer, Decorator, Strategy. Name three more. Patterns you learned and never used." },
  { title: 'SQL joins, from memory', subtitle: "INNER, LEFT, RIGHT, FULL OUTER, CROSS, SELF. Draw them in your head. The Venn diagrams you once memorised." },
  { title: 'Big-O notation warmup', subtitle: "O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ). Name a real algorithm for each. Start with the easy ones." },
  { title: 'Name 5 famous mathematicians', subtitle: "Euler, Gauss, Fermat — basic. Who else? Go further. There are many. Name five with a fact about each." },
  { title: 'The keyboard shortcut audit', subtitle: "Name 5 shortcuts you use every day. Then name 3 you know exist but have never tried. Then try them after this." },
  { title: 'Regex from memory', subtitle: "Write a regex for email validation in your head. Do not look it up. Realise how much you rely on Stack Overflow." },
  { title: 'Name 5 space missions', subtitle: "Apollo 11 is free. Voyager is free. Now name three more. Bonus if one launched this decade." },
  { title: 'List 5 programming paradigms', subtitle: "Imperative, object-oriented, functional, declarative, logic. Can you describe each in one sentence?" },
  { title: 'The versioning quiz', subtitle: "What does semantic versioning mean? Major.Minor.Patch. Easy. Now: when do you bump which one? Not everyone knows." },
  { title: 'Name the original 13 colonies', subtitle: "In any order. You probably get 8. The full list eludes most people. Bonus: which became which state?" },
  { title: 'Elements by symbol', subtitle: "Na is sodium. K is potassium. Hg is mercury. Fe is iron. What is Sn? (Tin. From stannum. Latin.)" },
  { title: 'The three laws of motion', subtitle: "Newton's three laws. Try to state each one in plain English without looking. Then check yourself." },
  { title: 'Name 5 logical fallacies', subtitle: "Ad hominem, straw man, false dichotomy... now find two more. These are the bugs in human reasoning." },
  { title: 'The human body quiz', subtitle: "How many bones? 206. How many muscles? ~600. How many neurons? ~86 billion. How many tabs do you have open?" },
  { title: 'Which came first?', subtitle: "The internet or the CD? The microwave or the moon landing? The barcode or the fax machine? Think." },
  { title: 'The trivia gauntlet', subtitle: "What is the capital of Kyrgyzstan? (Bishkek.) What is the currency of Vietnam? (Dong.) What language is most spoken in Brazil? (Portuguese.)" },
  { title: 'Name all James Bond actors', subtitle: "Connery, Moore, Dalton, Brosnan, Craig... and Lazenby. No one ever remembers Lazenby. He played 007 once." },
  { title: 'Which country has the longest coastline?', subtitle: "Not Australia. Not Brazil. It is Canada. At 202,080 km. That fact is almost useless and somehow satisfying." },
  { title: 'The 10 most spoken languages', subtitle: "Mandarin, Spanish, English, Hindi, Arabic, Bengali, Portuguese, Russian, Japanese, Punjabi. How many did you get?" },
  { title: 'Name 4 ancient civilisations', subtitle: "Mesopotamia, Egypt, Indus Valley, China — those are the classic four. Can you name a fifth most people miss?" },
  { title: 'Ohm\'s law from memory', subtitle: "V = IR. Voltage equals current times resistance. Now: what is the power formula? P = IV. You have this." },
  { title: 'The 10 commandments of good code', subtitle: "Not religious. Clean code commandments. DRY, SOLID, KISS, YAGNI... how many principles can you name?" },

  // ── More funny / absurd ────────────────────────────────────────────────────
  { title: 'Narrate walking to the kitchen', subtitle: "In your head, narrate it like a nature documentary. 'The developer approaches the watering hole alone, cautious but thirsty.'" },
  { title: 'What noise does your chair make?', subtitle: "Sit. Stand. Sit again. Listen to it. Give it a name. You will never hear it the same way again." },
  { title: 'Imagine you are in a film', subtitle: "What genre? What are you doing in the scene right now? Is the score dramatic or comedic? Be honest." },
  { title: 'Describe your desk in 3 words', subtitle: "No 'organised chaos.' No 'minimal.' Those are lies. Three honest words. Nothing more." },
  { title: 'Assign a spirit animal to your monitor', subtitle: "If your monitor were an animal, what would it be? Do not overthink. First instinct. Commit to it." },
  { title: 'Fake a stretch yawn', subtitle: "Arms up, mouth open, the full theatrical yawn. A fake yawn becomes a real one within 5 seconds. Science." },
  { title: 'Tap a rhythm on your desk', subtitle: "Something catchy. 10 seconds. Then stop. Then notice how it is still in your head 3 minutes later." },
  { title: 'Name the emoji you use most', subtitle: "Without checking. The one that lives rent-free in your muscle memory. What does it say about you?" },
  { title: 'Assign a Hogwarts house to your IDE', subtitle: "VS Code is definitely Ravenclaw. Vim users are Slytherin and they know it. Where does yours belong?" },
  { title: 'The chair swap question', subtitle: "If you had to swap chairs with anyone in the building right now, whose would you choose? Be specific." },
  { title: 'Name 5 things on your desk', subtitle: "Without looking. From memory. Then check. How many did you get right? Observation is a skill." },
  { title: 'Describe your current mood as weather', subtitle: "'Sunny with patches of cloud.' 'Foggy but clearing.' 'Humid, possible thunder.' What is your forecast?" },
  { title: 'The shoe rating', subtitle: "On a scale of comfort to style, where are your current shoes? All comfort? All style? Bold combination?" },
  { title: 'Write a tagline for your current task', subtitle: "Whatever you were just doing. Give it a film poster tagline. Make it dramatic. Go." },
  { title: 'Rate the lighting in this room', subtitle: "1 is a cave. 10 is interrogation. Where are you right now? Is it optimal for human flourishing?" },
  { title: 'The "if I were a font" question', subtitle: "What font are you? Be honest. Arial, Georgia, Comic Sans, Helvetica, Courier New. There is a right answer." },
  { title: 'Give your current project a film title', subtitle: "If the thing you are working on were a movie, what would it be called? Under what genre would it be filed?" },
  { title: 'Estimate the weight of your laptop', subtitle: "Guess in kg. Then look it up after. The discrepancy will tell you something about your relationship with it." },
  { title: 'Name 3 sounds outside this room', subtitle: "Listen deeply. Not the obvious ones. The underneath sounds. The ones only silence reveals." },
  { title: 'The "if this was a startup" pitch', subtitle: "Whatever you are working on: pitch it in one sentence like it is a TechCrunch headline. Go." },
  { title: 'Rename your job title creatively', subtitle: "'Senior Bug Archaeologist.' 'Infrastructure Whisperer.' 'Caffeine-Powered Logic Engineer.' What is yours?" },
  { title: 'The last thing you googled', subtitle: "Is it something you are proud of? Something useful? Something you would not want on a billboard? Reflect." },
  { title: 'The object origin game', subtitle: "Pick any object near you. In 20 seconds, think through every country it probably passed through to reach your desk." },
  { title: 'The "one thing I would automate" game', subtitle: "Name one thing in your life — outside work — that you would automate if it were technically possible. Think big." },
  { title: 'What are you avoiding?', subtitle: "Not at work. In life. Name it. Stare at it for 5 seconds. Then come back. You do not have to fix it now." },
  { title: 'Invent a word', subtitle: "Twenty seconds. Name the feeling you get when you open too many tabs. Or the sense that your coffee is about to be cold. Go." },
  { title: 'The six degrees test', subtitle: "Pick a random person famous from history. Can you connect them to yourself in six steps or fewer? Try." },
  { title: 'Your personal theme song', subtitle: "If your life were a film right now, what song would play in the background? No silence is also an answer." },
  { title: 'The window seat question', subtitle: "Window or aisle on a plane? And have you ever changed your answer? Think about what changed." },
  { title: 'The legacy question', subtitle: "In 10 words or fewer, what do you want to have stood for? Not your job. You. Write it in your head." },
  { title: 'What will you not remember in 10 years?', subtitle: "This stress. These meetings. These bugs. Most of it dissolves completely. That is freeing, not sad." },
  { title: 'Name your inner critic', subtitle: "It has a voice. It has phrases it repeats. Give it a name. Naming it shrinks it." },
  { title: 'The impossible choice', subtitle: "Lose your ability to listen to music OR never be able to read again. Neither. But if you had to. Which." },
  { title: 'The object on your desk with the best story', subtitle: "Pick one thing. Where did it come from? Who gave it to you? What does it mean? That is a whole conversation." },
  { title: 'Draft your out-of-office reply for fun', subtitle: "An honest one. Not the polite template. The real one. What would you actually say if it were true?" },
  { title: 'The age you felt most like yourself', subtitle: "Not the best year. The one where you were most authentically you. Most people name a specific one quickly." },
  { title: 'A childhood smell', subtitle: "The one that still takes you there instantly. Rain on hot concrete. Baked bread. A specific soap. Find it." },
  { title: 'Worst tech decision of your career', subtitle: "Name it. Safely. In your own head. We cannot tell anyone. The good ones are learning in disguise." },
  { title: 'The thing that surprised you about this job', subtitle: "The thing you did not expect going in. Good or bad. The thing nobody mentioned in the interview." },
  { title: 'Name 5 things that went well this week', subtitle: "Not tasks completed. Things that actually went well. It is Thursday. You have material." },
  { title: 'The question you are afraid to ask', subtitle: "At work. The one you have been holding. You are allowed to ask it. The silence around it costs more." },
  { title: 'If you could delete one app', subtitle: "From your life entirely. No reinstall. No withdrawal. Just gone. What would it be?" },
  { title: 'The compliment you have not accepted', subtitle: "Someone said something kind to you recently and you deflected it. Let it land now. Retroactively. It was true." },
  { title: 'Time travel: which year?', subtitle: "To visit, not to stay. Pick one year in history you would go to as a tourist. Then explain why to yourself." },
  { title: 'Rate this break out of 10', subtitle: "Honestly. Did you look away? Did you breathe? Did you think something non-work? We tried our best. How did we do?" },
];


// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMMSS = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const getTimeLabel = () => {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes();
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

// SVG ring constants
const RING_R = 7;
const RING_CIRC = 2 * Math.PI * RING_R;

// ─── Thin ring progress (accent-tinted) ───────────────────────────────────────

const RingProgress = ({ progress, orbRgb }) => {
  const dashOffset = RING_CIRC * (1 - progress);
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r={RING_R} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" />
      <circle
        cx="9" cy="9" r={RING_R}
        stroke={`rgba(${orbRgb},0.8)`}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 9 9)"
        style={{ transition: 'stroke-dashoffset 1.05s linear' }}
      />
    </svg>
  );
};

// ─── Ghost text button (no border, no band) ───────────────────────────────────

const GhostBtn = ({ onClick, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'none',
        border: 'none',
        padding: '6px 4px',
        cursor: 'pointer',
        fontSize: '0.68rem',
        fontWeight: 500,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: hovered ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.28)',
        transition: 'color 0.3s ease',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      {children}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const LookAway = ({ onDismiss, duration = 20 }) => {
  const [remaining, setRemaining] = useState(duration);
  const [timeLabel, setTimeLabel] = useState(getTimeLabel);
  const [isExiting, setIsExiting] = useState(false);
  const [msg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  // Pick a random palette once per overlay mount — independent of user accent
  const orbRgb = useMemo(
    () => ORB_PALETTES[Math.floor(Math.random() * ORB_PALETTES.length)],
    []
  );

  // ── Graceful dismiss: play exit animation then unmount ────────────────────
  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 500);
  }, [onDismiss]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (remaining <= 0) { dismiss(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, dismiss]);

  // ── Clock label updates ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTimeLabel(getTimeLabel()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Escape to dismiss ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dismiss]);

  // ── Lock screen ───────────────────────────────────────────────────────────
  const handleLockScreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => { });
    }
  }, []);

  const progress = remaining / duration;
  const anim = isExiting
    ? 'lookaway-out 0.5s cubic-bezier(0.4,0,1,1) forwards'
    : 'lookaway-in 0.7s cubic-bezier(0.16,1,0.3,1) both';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Look away break"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060608',
        animation: anim,
        overflow: 'hidden',
      }}
    >
      {/* ── Orb field — viewport-sized so rotation never compresses them ───── */}
      {/*
        Key insight: orbs are positioned with fixed vw/vh units so they keep
        their true circular shape regardless of the parent's rotation transform.
        The spin wrapper is purely a rotation pivot; orb dimensions are
        independent of it, so no ellipse / pixelation artefacts.
      */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          animation: 'lookaway-orb-spin 48s linear infinite',
          pointerEvents: 'none',
          transformOrigin: '50% 50%',
        }}
      >
        {/* Primary orb — dead centre, large breathing bloom */}
        <div style={{
          position: 'absolute',
          width: '70vmin',
          height: '70vmin',
          top: 'calc(50vh - 35vmin)',
          left: 'calc(50vw - 35vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, rgba(${orbRgb},0.38) 0%, rgba(${orbRgb},0.08) 50%, transparent 72%)`,
          filter: 'blur(52px)',
          animation: 'lookaway-bloom 8s ease-in-out infinite',
        }} />
        {/* Secondary orb — offset top-right */}
        <div style={{
          position: 'absolute',
          width: '50vmin',
          height: '50vmin',
          top: 'calc(10vh - 5vmin)',
          right: 'calc(8vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, rgba(${orbRgb},0.22) 0%, transparent 65%)`,
          filter: 'blur(64px)',
        }} />
        {/* Tertiary orb — offset bottom-left, counter-rotation */}
        <div style={{
          position: 'absolute',
          width: '44vmin',
          height: '44vmin',
          bottom: 'calc(8vh - 5vmin)',
          left: 'calc(6vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, rgba(${orbRgb},0.16) 0%, transparent 62%)`,
          filter: 'blur(80px)',
          animation: 'lookaway-orb-counter 32s linear infinite',
          transformOrigin: '50% 50%',
        }} />
      </div>

      {/* ── Subtle conic shimmer — slow independent counter-rotation ──────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-20%',
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(${orbRgb},0.04) 90deg, transparent 180deg, rgba(${orbRgb},0.03) 270deg, transparent 360deg)`,
          animation: 'lookaway-orb-counter 60s linear infinite',
          pointerEvents: 'none',
        }}
      />

      {/* ── Deep vignette — crushes edges to near-black ───────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, rgba(4,4,6,0.65) 65%, rgba(2,2,4,0.92) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* ── Time label — top, orb-tinted ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: `rgba(${orbRgb},0.55)`,
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 500,
          animation: 'lookaway-rise 1s cubic-bezier(0.16,1,0.3,1) 0.15s both',
          userSelect: 'none',
        }}
      >
        {timeLabel}
      </div>

      {/* ── Center content ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 32px',
          maxWidth: 580,
          animation: 'lookaway-rise 0.8s cubic-bezier(0.16,1,0.3,1) 0.06s both',
        }}
      >
        {/* Title — airy, light weight, high contrast */}
        <h1
          style={{
            color: '#ffffff',
            fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
            fontWeight: 200,
            letterSpacing: '-0.01em',
            lineHeight: 1.06,
            margin: '0 0 1.1rem',
            userSelect: 'none',
          }}
        >
          {msg.title}
        </h1>

        {/* Subtitle — softer, mid-weight */}
        <p
          style={{
            color: 'rgba(255,255,255,0.36)',
            fontSize: '1rem',
            fontWeight: 400,
            letterSpacing: '0.01em',
            lineHeight: 1.72,
            maxWidth: 400,
            margin: '0 0 2.6rem',
            userSelect: 'none',
          }}
        >
          {msg.subtitle}
        </p>

        {/* Timer — orb-tinted, monospace, light weight */}
        <div
          aria-live="polite"
          aria-label={`${remaining} seconds remaining`}
          style={{
            color: `rgba(${orbRgb},0.7)`,
            fontSize: 'clamp(1.7rem, 3.2vw, 2.6rem)',
            fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
            fontWeight: 300,
            letterSpacing: '0.12em',
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
          }}
        >
          {fmtMMSS(remaining)}
        </div>
      </div>

      {/* ── Ghost action row — no borders, no bands ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 44,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          animation: 'lookaway-rise 1s ease-out 0.3s both',
        }}
      >
        <GhostBtn onClick={dismiss}>
          <RingProgress progress={progress} orbRgb={orbRgb} />
          Skip
        </GhostBtn>

        <GhostBtn onClick={handleLockScreen}>
          <LockFill size={11} style={{ opacity: 0.65 }} />
          Lock Screen
        </GhostBtn>
      </div>
    </div>,
    document.body
  );
};
