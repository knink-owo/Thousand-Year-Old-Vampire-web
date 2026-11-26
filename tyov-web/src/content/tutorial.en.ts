/**
 * Tutorial copy (English) — taken from the official rulebook (Tim Hutchings),
 * chapter structure mirrors tutorial.zh.ts one-to-one.
 */
import type { Chapter } from './types'

export const chapters: Chapter[] = [
  {
    id: 'intro',
    title: 'About the game and what you need',
    icon: '🩸',
    sections: [
      {
        paras: [
          'Thousand Year Old Vampire is a lonely solo role-playing game in which you chronicle the unlife of a vampire over the many centuries of their existence, beginning with the loss of mortality and ending with their inevitable destruction.',
          'This vampire will surprise you as they do things that are unexpected, unpleasant, and sometimes tragic. Making gut-churning decisions, performing irreconcilable acts, and resolving difficult narrative threads are what this game is about as you explore the vampire’s human failings, villainous acts, and surprising victories.',
          'Game mechanics are simple and intuitive. Play progresses semi-randomly through the Prompt section of this book. Answer Prompts to learn about your vampire’s wants and needs, to learn what challenges they face, and to chart their decline into senescence. Build up a character record of Memories and then lose them to the inexorable crush of time. See everyone you’ve loved and hated grow old and die, then turn to dust.',
        ],
      },
      {
        heading: 'What is needed to play?',
        paras: [
          'You will need a ten-sided die (d10) and a six-sided die (d6). If you lack dice, use any random-number generator you like — this web version rolls both for you.',
          'You will also need a way to record your vampire’s story. Paper and pencil are fine, though it is very convenient to use a word processing document or other digital text tools. In a quick game, you only need a few pieces of paper to maintain a character record, but in the journaling game, you might fill a whole diary.',
          'In the appendix, you will also find multiplayer rules, safety tools that let you push yourself as hard as possible, alternate Prompts, examples of play, and some context for the creation of the game itself.',
          '(This web version provides the dice and the record; everything you need is on this page.)',
        ],
      },
    ],
  },
  {
    id: 'traits',
    title: 'Your vampire: the five traits',
    icon: '📋',
    sections: [
      {
        heading: 'Five traits',
        paras: [
          'The vampire whose chronicles you will record in this game is represented by five different traits: Memories, Skills, Resources, Characters, and Marks.',
          'Almost every time you receive a Prompt, one of your traits will be modified. For instance, you may be instructed to check a Skill. To do so, you place a checkmark next to that Skill. Alternately, the Prompt may cause you to lose a trait, which is indicated by striking it out with a line. Ensure that the lost trait stays readable because you may refer back to it later or even restore it. Some Prompts will give even more dramatic instructions for changing your traits. At all times, follow the instructions given in the Prompt.',
        ],
      },
      {
        heading: 'Memories',
        paras: [
          'Memories and Experiences are important moments that have shaped your vampire, crystallized in writing. They make up the core of the vampire’s self—the things they know and care about. An Experience is a particular event; a Memory is an arc of Experiences that are tied together by subject or theme.',
          'Experiences cover a particular event, but the amount of time represented by that event might vary dramatically. An Experience might describe a few seconds of impactful events, or it might cover two hundred years of lurking in an old castle.',
          'Almost every Prompt will create an Experience, and Experiences eventually combine with one another to become Memories. But there is only so much your vampire can remember. To reflect this limitation there is only a finite amount of space for Memories on your record sheet. Old Memories will be lost over the course of the game, making room for new ones. You will need to make difficult choices about which Memories to preserve and which to forget; these hard decisions are the core of the game.',
          'In game terms, an Experience is a single sentence that describes the resolution of a Prompt. Memories are a collection of related Experiences built up over time. Your vampire begins the game with space for five Memories, each of which can contain up to three Experiences.',
          'An Experience should be a single evocative sentence. An Experience is the distillation of an event, a single sentence that combines what happened and why it matters to your vampire. A good format for an Experience is a description of the event that can include how you feel or what you did about it. If necessary, you can add an em dash at the end to include more information.',
          'Be conscious of any traits affected by the Prompt, such as Characters or Resources, and try to incorporate them. Write in the first-person, from the vampire’s point of view.',
          'A Memory contains up to three Experiences. Each Memory should be defined by a theme, trait, or another subject that links its component Experiences in an intelligible way. Whenever a new Experience doesn’t fit into an existing Memory, place it in a new Memory, assuming one is available.',
          'Your vampire is allowed five Memories. Older Memories are lost when new Experiences occur and you have no place to put them. If you have filled all five Memories and need to start a new one, strike out an existing Memory and all of the Experiences it contains—forgetting things is a fundamental aspect of the game so embrace it.',
          'The decision about which Memories are lost belongs to you as the player. It is not a decision that the Vampire is consciously making. Unless instructed otherwise, you may strike out any Memory you like to make room for a new Experience.',
          'There is one way to preserve Memories when you run out of space. Instead of losing an existing Memory, you can move it into a Diary.',
        ],
      },
      {
        heading: 'Diary',
        paras: [
          'A Diary can hold up to four of your vampire’s Memories. Unlike Memories themselves, Diaries are physical objects that are added to your Resource List. You may freely create a Diary whenever you need to move a Memory into it. Like any other Resource, a Diary can be lost. When this happens strike out the Memories it held. Your vampire can have one Diary at a time, and it must contain at least one Memory.',
          'A Memory placed in the Diary is no longer in the vampire’s head—it exists only in the Diary and the vampire accepts whatever is written as truth. Once a Memory has been transferred to a Diary, you may not add any further Experiences to that Memory.',
        ],
      },
      {
        heading: 'Skills',
        paras: [
          'Skills describe the capabilities and characteristics of your vampire. They indicate what your vampire can do and what they might do. Swordplay, Relaxing Banter, Operate Heavy Machinery, I Do Not Blink The Sand Away, and I Teach the Nanissáanah are all acceptable Skills. When instructed to record a new Skill you should relate it to the content of the Prompt.',
          'Some Prompts will instruct you to check a Skill. To do this, place a checkmark next to that skill on your record sheet. Mechanically, this indicates that the Skill has been used. Narratively, a checked Skill gives you something to flavor your answers to later Prompts.',
          'If unchecked Skills are what your vampire is capable of, checked Skills are what they have done. They are a part of your vampire’s being, they are who the vampire is. It is entirely possible that your vampire might have Skills that you do not want to check. Instead of fighting this, revel in the plight of your humane vampire when they go to help a friend out of a bureaucratic jam and find that the only Skill they can check is Rage and Kill.',
          'You may only check a Skill once. If you are instructed to lose a Skill, strike it out—it is gone and no longer influences the way your vampire moves through the world.',
        ],
      },
      {
        heading: 'Resources',
        paras: [
          'Resources are assets or structures that are useful to your vampire, or items that they value. Knightly equipage, a loyal impi, a diamond tiara, the Castle Umbrecht, a business empire, a lucky penny, a screened-in charabanc, a Roman legion, the silvered key to the potentate’s treasure vault, a carboy of acid, a box of tallow candles—all are acceptable and engaging Resources.',
          'In the Prompts, there will occasionally be reference made to stationary Resources. These are possessions that cannot be physically hauled away with the vampire when they leave the area. Examples might be a haunted cave, an elephant-sized statue of Set, a chandlery, a hidden pit house, a hereditary title to land.',
          'When a Prompt instructs you to create Resources, be sure to create Resources that are contextually appropriate even if this leads to Resources that aren’t necessarily the most exciting or most useful. When a Prompt causes your vampire to lose a Resource, strike it out. Leave the entry legible because lost things might come back in time.',
          'Let your available Resources flavor how you write your Experiences. Curry your horse, ply your whip, command your submarine. Let Resources figure prominently when you are made to strike them out; don’t just lose your mansion but burn it to the ground, or at least describe a fierce legal battle over the deed.',
          'Don’t limit your vampire’s stuff to the Resources listed on the record sheet when answering Prompts. Your rich Flemish vampire will have a fencing foil if one is needed, it’s just not a Resource which can be spent to satisfy the mechanical needs of the game. If tools or homes or tombs are needed for narrative color you may create them as needed, just don’t write them down.',
        ],
      },
      {
        heading: 'Characters',
        paras: [
          'Characters are the people with whom your vampire has a relationship. Each Character should be named and described in a sentence fragment, such as Lawrence Hollmueller, a descendant of Baron Hollmueller, or Sister Adelpho, a meddlesome nun. Add more descriptors each time you interact with them in the course of resolving a Prompt.',
          'A Character can be mortal or immortal; you will be told which type when you are instructed to create a new Character. Mortals are regular human beings or other creatures that die with the passage of time. Immortals, on the other hand, are supernatural beings for whom time has little meaning. They might be other vampires, angels or demons, ghosts, scientific experiments gone wrong, forgotten deities, underground lurkers, meddlesome ancestors, invisible shamblers, softly-spoken animated corpses, household gods or sprites, disembodied heads enduring cursed existences under bell jars, or anything else suitably bizarre.',
          'Occasionally, you will realize that a Mortal must have died of old age. This might happen every four or five Prompts. When it does, strike out the Character’s name. Outside of this, Characters cannot be killed unless a Prompt tells you to do so, but you can otherwise narrate about them as you would like.',
        ],
      },
      {
        heading: 'Marks',
        paras: [
          'A Mark is a visible indication of your vampire’s undying state or any other thing that sets them apart from mortal people. An ever-bleeding wound on the throat, eyes that are blank and white, a trailing specter, a ferocious scar, a hollow abdomen full of rats. A Mark is something your vampire carries for their entire existence. When creating a Mark, consider whether your vampire conceals it, and how.',
          'Example Marks include: a pair of great bat wings—I cut them off with a saw but the stubs remain; my eyes are hypnotic so I must wear smoked glasses; a dark halo I cover with tall military hats; under the Moon my shadow takes the shape of a jaguar; animals fear me, children cry; I can become a wolf or a rat; I have hands with the fingers bent into backward claws, I wear long sleeves to cover them from view.',
        ],
      },
      {
        heading: 'Sidebar: what is a vampire?',
        paras: [
          'The vampire is the character you will follow through the narrative. How they manifest their vampiric nature is up to you, but Thousand Year Old Vampire makes several assumptions. To get the best experience out of this game system, your vampire…',
          '…should prey on human beings for sustenance;',
          '…should seek to camouflage themselves among those on which they feed;',
          '…should have been a human once, and still have human needs in one sense or another;',
          '…should be susceptible to environmental dangers that regular mortals might not care about, such as sunlight;',
          '…should be practically immortal;',
          '…should be mostly a loner.',
          'The Prompts in Thousand Year Old Vampire are not necessarily geared toward complex political machinations between factions of immortal beings.',
        ],
      },
    ],
  },
  {
    id: 'create',
    title: 'Creating your vampire',
    icon: '🕯️',
    sections: [
      {
        paras: [
          'Start by imagining a person in the distant past—a Roman emperor, a Mesopotamian midwife, a French knight. This person will become your vampire. Imagine when and where they were born and who they were in life. Start a Memory with one Experience that encapsulates their history. For instance: “I am Henri, son of Jon, born near the Loire Valley in the 13th Century of Our Lord; I am a poor knight swindled out of my inheritance.”',
          'This first Experience is a little different than most Experiences, in that it’s a broad summary of the vampire’s life before becoming an undead thing. This Experience will be slotted into the character record’s first Memory.',
          'Next, create at least three Mortals and add them to the vampire’s record sheet. These Mortals will have a relationship with your vampire—relatives, friends and lovers, enemies, mentors, debtors, or anything else appropriate for the time and place you have chosen. Describe each Character in a few words. Know that these Characters can and should be very important, but will not be around for long.',
          'Give your vampire-to-be three Skills fitting for their lot in life, and three Resources they obtained while still mortal. Remember, Resources can be almost anything. Big or small, a Resource is a Resource whether it’s an obsidian knife or a fleet of warships.',
          'Then, create three more Experiences—with one Experience each being entered into a separate Memory. Each of these Experiences should combine two of your vampire’s traits. If your vampire has the Longship Bøkesuden as a Resource and the Character Gundar, a Viking jarl, like a father to me, you might write an Experience like Gundar takes me on my first voyage aboard the Longship Bøkesuden; his touch calms me when we first leave sight of land.',
          'Lastly, create an Immortal. This is the creature that gifted (or cursed) your vampire with unlife. Create a Mark and an Experience that explains how your vampire became a creature of the night. One such Immortal is Baron Hollmueller, an Austrian noble and a vampire; he stole the deed to my land. The corresponding Experience might be: I duel the eerie Baron Hollmueller across the roof of the abbey; he nearly cuts my head from my shoulders but I do not die—which leads to the Mark: my neck is permanently broken, I wear tight scarves and walk slowly to maintain my dignity.',
          'Once you have finished with your vampire, they will have three Skills, three Resources, a Mark, at least three Mortals, one Immortal, and one Experience in each of their five Memories.',
        ],
      },
    ],
  },
  {
    id: 'play',
    title: 'Playing the game',
    icon: '🎲',
    sections: [
      {
        heading: 'The flow of play',
        paras: [
          'To play Thousand Year Old Vampire, you answer a series of Prompts. Answer these Prompts to learn about your vampire, experience their travails, and be surprised by their doings. Responding to the Prompts in satisfying ways is the joy of this game.',
          'You can answer Prompts either in writing, like a journal, or just aloud to yourself. Number your entries to keep the chronology straight.',
          'In the process of answering Prompts, you create, lose, and alter your vampire’s traits as instructed. Every time you answer a Prompt you must create an Experience and add it to a Memory unless instructed otherwise.',
        ],
      },
      {
        heading: 'Dice and movement',
        paras: [
          'Roll your d10 and d6, and subtract the result of the d6 from that of the d10. If the result is a positive number, move forward that many Prompts; if it is a negative number, move backward instead. A 0 means you encounter the same Prompt a second time.',
          'Let us imagine that I have just answered Prompt 11. I roll 7 on the d10 and 4 on the d6, which means that I move forward three and end up at Prompt 14. However, if I rolled 4 on both dice, I would answer Prompt 11 again.',
          'You can’t move backward past Prompt 1. Just encounter 1 again.',
        ],
      },
      {
        heading: 'Prompt entries',
        paras: [
          'You will notice that Prompts have second and third entries. These are encountered the second and third times you land on a Prompt.',
          'When you land on a Prompt resolve the first entry; if you land on it again resolve the next entry for that Prompt, each entry being labelled a, b, or c. If you’ve landed on a Prompt three times and encountered all three entries, skip to the next Prompt.',
        ],
      },
      {
        heading: 'Skill and Resource substitutions',
        paras: [
          'If you are instructed to check a Skill but have no unchecked Skills available, lose a Resource instead. Likewise, if you cannot lose a Resource when instructed to do so, check a Skill. When either of these substitutions occurs it indicates that things have gone very badly for your vampire. Narrate the worst possible outcome. Only Skills and Resources may be substituted for each other. You may not choose to lose Characters, Memories, or Marks in place of a Skill or Resource.',
        ],
      },
      {
        heading: 'The game ends…',
        paras: [
          '…if you are unable to check or lose a Skill or Resource when required to do so, or',
          '…if a Prompt tells you that the game has ended.',
          'If you must lose a Skill or Resource and you have none, then your game is over—narrate your vampire’s demise using the Prompt for inspiration.',
        ],
      },
    ],
  },
  {
    id: 'styles',
    title: 'Two styles of play',
    icon: '✍️',
    sections: [
      {
        heading: 'Quick game',
        paras: [
          'There are two ways to play Thousand Year Old Vampire: as a Quick Game or a Journaling Game.',
          'In a Quick Game, answer the Prompts entirely in the Memory area of your character record. This method is fast and satisfying and gives you greater flexibility in interpreting your vampire’s story.',
        ],
      },
      {
        heading: 'Journaling game',
        paras: [
          'In the Journaling Game, you keep a diary. Answer the Prompts in writing, dedicating a short paragraph or so to each question. You will end up with a document that you can look back at later. In addition to a journal entry, you must still add an Experience for each Prompt.',
          'In the case of any contradictions or complications, your Memories and Experiences take precedence over the detail of your journal entries. As you play, you will come to understand aspects of the story that may not have been clear earlier on. You can modify or ignore earlier journal entries if needed, but you may never modify Memories unless instructed to do so by a Prompt!',
        ],
      },
      {
        heading: 'Answering Prompts',
        paras: [
          'Answer Prompts in a way that feels natural. Never force things. If relationships between existing Traits or past events relate to a Prompt, work them in. You do not need to answer every question in the Prompt.',
          'Prompts will often combine to tell stories. If a helpful Character was introduced in one Prompt and the following Prompt has the vampire acquire a new Resource, find the relationship between them. Any amount of time can pass between Prompts, so several Prompts might join together to make a story arc that lasts days or decades.',
          'Cede control to the game. Prompts are sparks for creativity and connection. Feel free to gently reinterpret answers to earlier Prompts to better make sense of current situations. But you should not try to tie everything together, it’s not necessary. Your vampire will live for a thousand years, and many small, unresolved events will occur during their existence. Sometimes a Character will appear and then leave the game without accomplishing anything of note, or a Resource will go unused, both of which are fine—that’s just how life, or un-life, is.',
          'Overthinking is unhelpful. Not every Prompt needs to be important. You do not need to explain every decision you make while answering a Prompt. You can let some of it wait until later. Let the game bring back what matters.',
          'Be uncomfortable. Your protagonist is a vampire, even if you try to keep them decent and humane. Terrible and delicious things are going to happen. You should have moments of discomfort as Prompts combine with constrained resources to result in your vampire murdering loved ones and performing strange deeds. This is a strength of the game, so let darkness fall where it may.',
          'Prompts are opportunities to learn about history and the real world. Turn to Wikipedia and read about the different types of Turkish nobility if you need to.',
          'The game will wait.',
        ],
      },
      {
        heading: 'The passage of time',
        paras: [
          'This game is about the grind of centuries. Your vampire will lose their very memories to the passage of years and must pursue continuous reinvention to keep up with the evolution of society around them. Time is very loose, so imagine its progression as you like. Think about historical events and work them in when it feels right; world wars and political upheavals are hugely important events, even for vampires.',
          'For general guidance, consider the first seven or eight Prompts you answer to be the first busy years after your character becomes a vampire. Everyone they know is still alive and the world is still the world of their mortal life. By contrast, their final Experiences might take place in the early 21st century.',
          'Don’t fret about specific years, but do watch for obvious breaks in the timeline. A series of Prompts might interrelate to tell a small story, only for something to interrupt that story. Take the opportunity to jump a few decades ahead. However, if you reach a game-ending Prompt and it’s only the Fifteenth Century, that’s fine too.',
        ],
      },
    ],
  },
  {
    id: 'overview',
    title: 'The Prompts: a quick review',
    icon: '📜',
    sections: [
      {
        paras: [
          'Start at Prompt 1 on the next page;',
          'Subtract a d6 from a d10 and move that many Prompts;',
          'A positive number moves you forward;',
          'A negative number moves you backward;',
          'You can’t move backward past Prompt 1. Just encounter 1 again;',
          'A zero keeps you in the same place;',
          'When you land on a Prompt resolve the first entry;',
          'If you land on a Prompt again you resolve the next entry for that Prompt, each entry being labelled a, b, or c;',
          'If you’ve landed on a Prompt three times and encountered all three entries, skip to the next Prompt.',
        ],
      },
    ],
  },
  {
    id: 'example',
    title: "Examples of play",
    icon: '🎭',
    sections: [
      {
        heading: 'Example one',
        paras: [
          'I think I want to create a vampire in early Eastern Europe, so I look up names and choose Ada. Next, I decide Ada is a Slav living in the region that will later become Poland. I start her first Memory with one Experience that encapsulates Ada’s existence up to this point: I am Ada, a Slavic woman living on the edge of the wild Tatra Mountains.',
          'I choose some Traits for Ada.',
          'Characters: Piotr, a shepherd boy who tends my flocks; Róża, my elderly mother, she lives in my homestead; Hania, my neighbor, a friend and enemy.',
          'Skills: Gentle Butcher, Beermaking, Hill Wanderer.',
          'Resources: Ornate Walking Staff, Large Flock of Sheep, Sack of Silver Coins.',
          'Then I combine these Traits to create three new Memories, each containing one Experience.',
          'All day, Mother Róża sits quietly by the beer vat; she says it sings sweet songs to her, and she carves what she hears onto a magnificent ash walking stick.',
          'Piotr was orphaned during a bandit raid; I hold his family’s silver coin until he comes of age—in the meantime he works with the sheep.',
          'Hania complains when I walk my sheep through the stream, but she never says no to the mutton I gift her.',
          'Next I create another Character: the vampire who will cast Ada into unlife, along with a Mark and a Memory related to this.',
          'Character: Vyri, a stick-thin thing that lives in a cave.',
          'Memory: Wandering through the hills, I hear someone crying for help; it is a trick by the demon Vyri, who drinks my blood then casts me into a mountain stream to die—Hania and her husband pull me from the water hours later, thinking me dead.',
          'Mark: Skin like ice; I am careful not to touch anyone.',
          'I now have a vampire composed of three Skills, three Resources, one Mark, and five Memories made up of one Experience each. I’m ready for Ada to start encountering Prompts.',
          'I roll a d10 and a d6, subtracting the latter from the former. I get an 8 and a 3: 8 minus 3 is 5. Starting at Prompt 1, I count forward five Prompts to Prompt 6: “A mortal Character begins serving you. Who are they? Why are they drawn to you? Create a new mortal Character.”',
          'Let’s see… The first thing that comes to mind is pretty wild. I create Josse, an astronomer of the French court. I need to write an Experience about him and attach it to one of Ada’s Memories. To the second Memory, the one about Piotr, I add: These same bandits bring me Josse, a ragged wanderer who tells me in halting Polish that he foresaw my rise to mystic power in the stars and has been searching for me for five years; he installs himself in an outbuilding and makes intricate masks out of river clay.',
          'One sentence answers are the limit, even if they get stretchy.',
        ],
      },
      {
        heading: 'Example two',
        paras: [
          'Soo-ae is a Korean-born vampire who we find in 1855 living on a whaling station in Greenland. Soo-ae is currently at Prompt 56 and they have had many, many things happen during their long existence; all five of their Memories are full, containing three Experiences each.',
          'Rolling a 1, Soo-ae progresses to Prompt 57: “Your knowledge of old things becomes a strength. Based on a checked Skill what knowledge do you share with contemporary mortals? Check a Skill. Create a Resource.”',
          'Oh, neat! I think that Soo-ae’s time in Britain in the service of Queen Eltilda the Brave, hundreds of years ago, gave them insight into complex issues of inheritance and title. They have the checked Skill Sea Lawyer, which relates closely enough.',
          'Soo-ae only has two unchecked Skills: Biting Wit and Sled Dog Trainer. Dang, this is tough. I strike out Biting Wit and start to write an Experience.',
          'That’s when I realize Soo-ae’s five Memory slots are all full up with three Experiences each, and their Diary is also full with four Memories containing three Experiences each. I strike out a Memory from Soo-ae’s Diary about traveling the Silk Road with their father five hundred years ago and move one of their current Memories into the book. Soo-ae no longer has any Memories relating to their time before becoming a vampire.',
          'In the newly freed Memory slot I write: I become a correspondent with the London magazine Punch; my barbed poems about the histories of prominent families reveal that I know much, and they are soon hiring me to both share secrets and keep them.',
          'Lastly, I take the Resource A Fat London Bank Account.',
        ],
      },
    ],
  },
]
