export type EventLibraryDuration = 5 | 10 | 15;

export interface EventLibrarySeedItem {
  body: string;
  category: string;
  durationMinutes: EventLibraryDuration;
  id: string;
  script: string;
  title: string;
}

export const EVENT_LIBRARY_CATALOG: EventLibrarySeedItem[] = [
  {
    id: 'abundance-dawn-circle',
    title: 'Abundance Dawn Circle',
    category: 'Abundance',
    durationMinutes: 5,
    body: 'Set a clear morning intention for open doors, provision, and wise choices.',
    script:
      'We gather at the beginning of this day with calm expectation. We welcome provision that honors integrity, supports our households, and strengthens our purpose. We choose gratitude before results and release panic around timing. Let every decision be clear, practical, and aligned with what is good. Let the right opportunities find us, and let us recognize them with courage. We close this moment grounded and ready to receive with humility.',
  },
  {
    id: 'financial-flow-intention-room',
    title: 'Financial Flow Intention Room',
    category: 'Abundance',
    durationMinutes: 10,
    body: 'Call in healthy financial flow with discipline, stewardship, and generosity.',
    script:
      'In this room we align money with meaning. We ask for steady income, honest growth, and practical wisdom for every resource in our care. We release fear based spending and confusion around priorities. Let debt reduction, savings, and generous giving move together in healthy balance. Let our prosperity remain ethical, peaceful, and useful for the people we serve. We finish this session with confidence that consistent steps can produce lasting financial freedom.',
  },
  {
    id: 'opportunity-gateway-gathering',
    title: 'Opportunity Gateway Gathering',
    category: 'Manifestation',
    durationMinutes: 15,
    body: 'Open pathways for aligned opportunities, partnerships, and strategic timing.',
    script:
      'We enter this gathering with open minds and steady hearts. We ask for opportunities that match our values, amplify our gifts, and create real benefit for others. We release the habit of chasing every option and choose discernment instead. Let the right introductions happen naturally and let conversations carry clarity and momentum. Let hidden doors become visible and timed with precision. We hold a shared intention for meaningful progress that is sustainable and abundant for all involved.',
  },
  {
    id: 'career-breakthrough-field',
    title: 'Career Breakthrough Field',
    category: 'Career',
    durationMinutes: 10,
    body: 'Manifest career breakthroughs through preparation, confidence, and aligned action.',
    script:
      'We center our attention on meaningful work and right placement. We call in roles that value our strengths, stretch our capacity, and honor wellbeing. We release self doubt and fear of rejection. Let our applications and interviews reflect clarity and confidence. Let managers and collaborators recognize our true value. We leave this room committed to excellent preparation and faithful follow through as new career doors begin to open.',
  },
  {
    id: 'entrepreneur-clarity-session',
    title: 'Entrepreneur Clarity Session',
    category: 'Career',
    durationMinutes: 15,
    body: 'Strengthen entrepreneurial vision with clarity, resilience, and ethical growth.',
    script:
      'We gather as builders and creators of meaningful solutions. We ask for clarity in strategy, simplicity in execution, and wisdom in every decision that affects people and mission. We release urgency that leads to burnout and reactive choices. Let our offers become more useful and our message become more precise. Send the right clients, collaborators, and advisors for this season. We close this session rooted in purpose and prepared for disciplined action that leads to sustainable growth.',
  },
  {
    id: 'purpose-alignment-assembly',
    title: 'Purpose Alignment Assembly',
    category: 'Purpose',
    durationMinutes: 10,
    body: 'Align daily choices with deeper purpose and long term calling.',
    script:
      'In this assembly we realign our lives with true purpose. We ask for clarity about what matters most and courage to remove distractions that dilute our energy. We release the pressure to perform for approval. Let our calendars reflect our values and our work reflect our calling. Give us focus and discipline in the assignments that are truly ours. We end this practice centered and ready to move in a direction that brings peace and lasting impact.',
  },
  {
    id: 'vision-expansion-forum',
    title: 'Vision Expansion Forum',
    category: 'Manifestation',
    durationMinutes: 15,
    body: 'Expand vision while grounding it in practical milestones and collaboration.',
    script:
      'We hold space for expanded vision without losing grounded execution. We invite imagination, strategy, and courage to work together in harmony. We release small thinking shaped by old disappointment. Let bold ideas emerge with structure and sequence. Let each vision become clearer in language and first actions. Bring the right partners and resources for implementation. We conclude with renewed perspective and practical next steps for measurable outcomes.',
  },
  {
    id: 'gratitude-amplifier-circle',
    title: 'Gratitude Amplifier Circle',
    category: 'Gratitude',
    durationMinutes: 5,
    body: 'Use gratitude to raise emotional state and strengthen manifestation focus.',
    script:
      'We begin with gratitude for breath, connection, and every sign of growth already present. We choose to notice what is working and honor progress that is often overlooked. Gratitude steadies the nervous system and widens perspective. From this grounded place we welcome new blessings with humility and trust. Let thankfulness shape our tone and choices today. We close carrying a quiet joy that makes space for more goodness to arrive.',
  },
  {
    id: 'heart-coherence-relationships-room',
    title: 'Heart Coherence for Relationships',
    category: 'Relationships',
    durationMinutes: 10,
    body: 'Manifest healthier relationships through emotional coherence and compassion.',
    script:
      'We bring our relationships into this field with tenderness and honesty. We ask for patient listening and wise speech in every conversation. We release reactive patterns that block connection. Let trust be rebuilt where there has been strain and let affection increase in daily moments. Teach us to set clear boundaries without closing our hearts. We leave prepared to nurture relationships that are safe, mutual, and deeply life giving.',
  },
  {
    id: 'forgiveness-renewal-space',
    title: 'Forgiveness Renewal Space',
    category: 'Forgiveness',
    durationMinutes: 15,
    body: 'Transform resentment into freedom, repair, and emotional renewal.',
    script:
      'In this space we choose freedom over resentment. We acknowledge what hurt us without denying the truth. We release the burden of replaying pain and ask for strength to forgive with wisdom and healthy boundaries. Replace bitterness with compassion that does not erase accountability. Where repair is possible, guide us with courage and clarity. We conclude this practice lighter, clearer, and more available for joy and renewed trust.',
  },
  {
    id: 'family-harmony-intention-room',
    title: 'Family Harmony Intention Room',
    category: 'Relationships',
    durationMinutes: 10,
    body: 'Set intentions for harmony, patience, and unity within family life.',
    script:
      'We hold our families in this room with compassion and hope. We ask for patience in daily interactions, wisdom in conflict, and gentleness in correction. We release harsh words and unresolved tension. Let each home represented here become a place of emotional safety and honest communication. Strengthen mutual respect across generations. We close this intention with gratitude for every step toward peace and unity.',
  },
  {
    id: 'home-blessing-manifestation',
    title: 'Home Blessing Manifestation',
    category: 'Home',
    durationMinutes: 5,
    body: 'Invite peace, protection, and welcoming energy into the home.',
    script:
      'We bless every home connected to this gathering. Let each room be filled with peace, order, and warmth. We release stress that follows us through the door and choose presence with the people we love. Let rest be deeper and conversation be kinder. Protect these homes from harm and confusion. Let them become places where healing and joy are renewed each day.',
  },
  {
    id: 'calm-nervous-system-reset-room',
    title: 'Calm Nervous System Reset Room',
    category: 'Wellbeing',
    durationMinutes: 5,
    body: 'Regulate the nervous system and restore calm for focused intention work.',
    script:
      'We slow our breath and invite calm into every part of the body. We release accumulated pressure from the day and choose safety in this present moment. Let shoulders soften, thoughts settle, and heartbeat steady. We welcome peace that is practical and embodied. From this regulated state we set intentions with clarity rather than urgency. We finish grounded, centered, and ready to move with wisdom.',
  },
  {
    id: 'healing-light-communion',
    title: 'Healing Light Communion',
    category: 'Healing',
    durationMinutes: 15,
    body: 'Gather for collective healing intention across body, mind, and spirit.',
    script:
      'We gather in a spirit of healing for body, mind, and heart. We acknowledge pain without surrendering hope. We invite restorative strength into areas of exhaustion, grief, and fear. Let caregivers be guided with insight and let treatment paths be effective. We release isolation and welcome community care. Renew confidence that recovery can unfold in honest stages. We close with gentleness, resilience, and a shared commitment to life giving choices.',
  },
  {
    id: 'body-restoration-intention',
    title: 'Body Restoration Intention',
    category: 'Healing',
    durationMinutes: 10,
    body: 'Set a focused intention for physical restoration and sustainable energy.',
    script:
      'We set intention for physical restoration and steady energy. We listen to our bodies with respect and respond with wise care. We release neglect and overwork. Let sleep deepen, digestion improve, and strength return in measurable ways. Guide us toward movement and treatment choices that support long term wellbeing. Help us celebrate small improvements and remain patient through the process. We end with renewed trust in the body capacity to heal.',
  },
  {
    id: 'confidence-voice-activation',
    title: 'Confidence and Voice Activation',
    category: 'Confidence',
    durationMinutes: 5,
    body: 'Activate confidence and clear expression for key conversations and decisions.',
    script:
      'We activate confidence rooted in truth, not performance. We release fear of being misunderstood and the habit of shrinking our voice. Let our words be clear, calm, and courageous. Help us speak at the right time with respect and conviction. Let confidence serve connection and progress. We close this activation with steady posture and trust in our authentic voice.',
  },
  {
    id: 'creative-momentum-chamber',
    title: 'Creative Momentum Chamber',
    category: 'Creativity',
    durationMinutes: 10,
    body: 'Manifest creative momentum and overcome resistance to starting.',
    script:
      'In this chamber we call forth creative momentum. We release perfectionism, delay, and fear of judgment. Let ideas arrive with freshness and practical form. Help us move from concept to draft and from draft to refinement. Let discipline and playfulness work together in balance. Bring collaborators and feedback that improve the work without diluting its truth. We leave ready to create with consistency, courage, and joy.',
  },
  {
    id: 'artist-inspiration-convergence',
    title: 'Artist Inspiration Convergence',
    category: 'Creativity',
    durationMinutes: 15,
    body: 'Deepen artistic inspiration while staying grounded in craft and completion.',
    script:
      'We gather as artists and makers devoted to meaningful expression. We invite inspiration that is vivid, honest, and useful. We release creative paralysis and pressure to imitate what is popular. Let each artist access original voice and disciplined practice. Strengthen craft, sharpen intuition, and expand range. Guide us through revision with patience and precision. We close with renewed inspiration and practical commitment to work that only we can create.',
  },
  {
    id: 'sacred-leadership-intention-hub',
    title: 'Sacred Leadership Intention Hub',
    category: 'Leadership',
    durationMinutes: 10,
    body: 'Manifest leadership rooted in service, courage, and emotional maturity.',
    script:
      'We set intention for leadership that serves rather than controls. We release ego driven reactions and choose humility with strength. Let decisions be clear, fair, and timely. Help us listen deeply to people we lead and communicate direction with confidence. Strengthen our ability to hold complexity without losing compassion. Let accountability and trust grow together. We leave ready to lead with integrity and calm authority.',
  },
  {
    id: 'community-service-manifestation',
    title: 'Community Service Manifestation',
    category: 'Community',
    durationMinutes: 15,
    body: 'Manifest collective service impact through aligned teams and resources.',
    script:
      'We gather for communities that need practical support and enduring care. We ask for aligned volunteers, sufficient resources, and clear coordination. We release fragmentation and competition among people with shared mission. Let compassion become organized action. Let partnerships form across neighborhoods and cultures. Give us stamina for consistent service and wisdom to measure real impact. We close committed to serve in ways that are sustainable and transformative.',
  },
  {
    id: 'peaceful-sleep-invocation-event',
    title: 'Peaceful Sleep Invocation Event',
    category: 'Wellbeing',
    durationMinutes: 5,
    body: 'Prepare body and mind for deep, restorative sleep.',
    script:
      'We settle into stillness and prepare for restorative sleep. We release unfinished conversations and racing thoughts from this day. Let the mind grow quiet and the body feel safe enough to rest deeply. We invite peaceful dreams and complete renewal through the night. May tomorrow begin with clarity and refreshed strength. We close this invocation in calm trust.',
  },
  {
    id: 'joy-reawakening-gathering',
    title: 'Joy Reawakening Gathering',
    category: 'Wellbeing',
    durationMinutes: 10,
    body: 'Reawaken joy and emotional aliveness after stress or discouragement.',
    script:
      'In this gathering we welcome joy back into the center of our lives. We release heaviness that has muted wonder and creativity. Let small moments of delight become visible again. Restore laughter, friendship, and hopeful expectation. Help us celebrate progress without waiting for perfection. Let joy strengthen resilience and expand generosity. We finish lighter in spirit and ready to live with openness and gratitude.',
  },
  {
    id: 'resilience-under-pressure-room',
    title: 'Resilience Under Pressure Room',
    category: 'Wellbeing',
    durationMinutes: 15,
    body: 'Build resilience for high pressure seasons without losing inner peace.',
    script:
      'We hold this room for everyone carrying heavy responsibility. We acknowledge pressure and fatigue without giving them final authority. We ask for resilience that is steady, wise, and compassionate. Let minds stay clear in complex moments and emotions remain regulated when demands increase. Guide us to rest strategically and ask for support early. Replace survival mode with sustainable rhythm. We close strengthened and able to meet pressure with grounded confidence.',
  },
  {
    id: 'trust-surrender-session',
    title: 'Trust and Surrender Session',
    category: 'Spiritual Growth',
    durationMinutes: 10,
    body: 'Practice surrender while maintaining clear responsibility and action.',
    script:
      'We enter this session to practice trust and release control that is no longer useful. We do not abandon responsibility, yet we surrender outcomes we cannot force. Teach us to act with diligence and then rest in peace about timing. Let anxiety soften as faith grows stronger. Help us notice guidance and take the next right step. We close in quiet confidence, trusting that aligned effort and surrendered hearts can move mountains.',
  },
  {
    id: 'self-worth-restoration-circle',
    title: 'Self Worth Restoration Circle',
    category: 'Healing',
    durationMinutes: 5,
    body: 'Restore self worth and inner dignity after criticism or rejection.',
    script:
      'We gather to restore self worth with tenderness and truth. We release labels that diminished dignity and stories that keep us small. Let compassion replace harsh self judgment. Let courage return where shame once lived. Help us see ourselves with humility and deep value. We close grounded in worth that does not depend on approval.',
  },
  {
    id: 'prosperous-partnerships-forum',
    title: 'Prosperous Partnerships Forum',
    category: 'Abundance',
    durationMinutes: 15,
    body: 'Manifest prosperous partnerships based on trust, clarity, and mutual gain.',
    script:
      'We call in partnerships that are mutually beneficial, transparent, and purpose aligned. We release agreements shaped by urgency or unclear expectations. Let honest conversations define roles and shared outcomes. Bring collaborators whose strengths complement one another and whose character sustains trust. Let conflict be handled with maturity and respect. May each partnership produce meaningful value for clients and communities. We end ready to build alliances that prosper over time.',
  },
  {
    id: 'debt-freedom-intention-room',
    title: 'Debt Freedom Intention Room',
    category: 'Abundance',
    durationMinutes: 10,
    body: 'Set focused intention for debt reduction and long term financial freedom.',
    script:
      'We set clear intention for debt freedom and responsible stewardship. We face numbers honestly and reject shame that blocks action. Give us discipline to budget consistently and wisdom to prioritize repayment. Open practical opportunities for additional income and reduced waste. Let each payment become a sign of progress and regained agency. We close hopeful, organized, and committed to choices that create lasting freedom.',
  },
  {
    id: 'generous-heart-abundance-circle',
    title: 'Generous Heart Abundance Circle',
    category: 'Abundance',
    durationMinutes: 5,
    body: 'Manifest abundance through generosity, gratitude, and trust.',
    script:
      'We gather with hearts that desire both abundance and generosity. We release scarcity thinking that closes our hands and narrows vision. Let gratitude increase what we notice and generosity increase what we share. Teach us to steward resources with wisdom and compassion. May prosperity become a channel of blessing for others. We close open, thankful, and ready to give and receive with joy.',
  },
  {
    id: 'career-transition-support-event',
    title: 'Career Transition Support Event',
    category: 'Career',
    durationMinutes: 15,
    body: 'Support major career transitions with courage, strategy, and stability.',
    script:
      'We hold space for every person navigating career transition. We release fear of the unknown and welcome clarity for this next chapter. Let old skills translate into new opportunities with confidence. Guide us to update our story, strengthen our network, and move with strategic consistency. Provide emotional stability during uncertainty and practical provision during change. We end with courage, direction, and trust that transition can lead to meaningful advancement.',
  },
  {
    id: 'new-beginning-manifestation-room',
    title: 'New Beginning Manifestation Room',
    category: 'Manifestation',
    durationMinutes: 10,
    body: 'Anchor a powerful fresh start with clarity, courage, and consistency.',
    script:
      'In this room we bless new beginnings with clarity and boldness. We release attachment to old patterns that no longer serve growth. Let this season carry fresh energy, wise boundaries, and aligned priorities. Help us start cleanly, move consistently, and stay faithful when momentum feels slow. Let supportive people and timely resources appear along the way. We close grounded in hope and committed to daily action for this new chapter.',
  },
  {
    id: 'compassionate-communication-circle',
    title: 'Compassionate Communication Circle',
    category: 'Relationships',
    durationMinutes: 5,
    body: 'Strengthen communication with empathy, truth, and respectful listening.',
    script:
      'We set intention for compassionate communication in every relationship. We release reactive speech and assumptions that create distance. Let us speak truth with kindness and listen with genuine curiosity. Help us pause before responding and choose words that build trust. We close prepared to communicate with empathy, clarity, and respect.',
  },
  {
    id: 'reconciliation-intention-gathering',
    title: 'Reconciliation Intention Gathering',
    category: 'Forgiveness',
    durationMinutes: 15,
    body: 'Create space for reconciliation where healing and accountability can coexist.',
    script:
      'We gather with intention for reconciliation where it is safe and wise. We acknowledge pain honestly and invite grace that does not ignore truth. Let humility open the door to meaningful repair. Give us language for apology and courage for accountability. Protect everyone involved with healthy boundaries and clear expectations. Where restoration is possible, guide it gently. We close with hearts open to healing and actions aligned with integrity.',
  },
  {
    id: 'fertility-hope-manifestation',
    title: 'Fertility Hope Manifestation',
    category: 'Healing',
    durationMinutes: 10,
    body: 'Hold fertility intentions with tenderness, hope, and emotional support.',
    script:
      'We hold fertility hopes with tenderness, patience, and unwavering compassion. We release fear, isolation, and pressure of comparison. Let every body represented here receive care, strength, and wise guidance. Surround each person with supportive relationships and emotional steadiness. Keep hope alive without denying complexity of this journey. We close with gentle courage and trust for the path ahead.',
  },
  {
    id: 'parenting-wisdom-event',
    title: 'Parenting Wisdom Event',
    category: 'Family',
    durationMinutes: 5,
    body: 'Seek practical wisdom, patience, and presence for parenting well.',
    script:
      'We ask for parenting wisdom that is patient, steady, and practical. Help us guide with love, correct with calm, and encourage with consistency. We release guilt over imperfect moments and choose growth over shame. Let homes be safe places for learning and joy. We close strengthened for the sacred daily work of parenting.',
  },
  {
    id: 'exam-confidence-intention-room',
    title: 'Exam Confidence Intention Room',
    category: 'Education',
    durationMinutes: 10,
    body: 'Boost exam confidence, memory recall, and calm focus under pressure.',
    script:
      'In this room we set intention for exam confidence and clear recall. We release panic and mental fog. Let preparation become organized and retention grow stronger each day. Give calm focus during study and composure during testing. Help us manage time wisely and respond to each question with clarity. We close confident, prepared, and ready to perform with steady excellence.',
  },
  {
    id: 'students-focus-manifestation-room',
    title: 'Students Focus Manifestation Room',
    category: 'Education',
    durationMinutes: 15,
    body: 'Manifest sustained focus, motivation, and healthy study rhythm.',
    script:
      'We gather on behalf of students seeking focus and motivation. We release distraction and fear of failure. Let concentration deepen and study sessions become fruitful. Help us break large goals into manageable steps and maintain momentum through the week. Strengthen memory, comprehension, and confidence. Guide us to balance effort with rest so learning remains sustainable. We close with disciplined intention and practical study plans.',
  },
  {
    id: 'travel-protection-intention-circle',
    title: 'Travel Protection Intention Circle',
    category: 'Protection',
    durationMinutes: 5,
    body: 'Set collective intentions for safe travel, timing, and peaceful journeys.',
    script:
      'We hold every traveler in this circle with care and protection. Let routes be clear, transport be reliable, and timing be smooth. Guard each person from harm and unnecessary stress. Give alertness to drivers and calm to anxious minds. We close trusting for safe departure, safe arrival, and peace throughout each journey.',
  },
  {
    id: 'global-peace-pulse-event',
    title: 'Global Peace Pulse Event',
    category: 'Global',
    durationMinutes: 15,
    body: 'Unite global intention for peace, dignity, and reconciliation across nations.',
    script:
      'We join across nations to set one intention for peace. We remember communities experiencing conflict and displacement and hold them with compassion and resolve. Let leaders choose wisdom over ego and let dialogue replace violence. Strengthen peacemakers and caregivers working on the ground. Comfort families carrying grief and uncertainty. Inspire practical pathways to justice, safety, and restoration. We close committed to peace in our words and daily choices.',
  },
  {
    id: 'mission-driven-business-room',
    title: 'Mission Driven Business Room',
    category: 'Career',
    durationMinutes: 10,
    body: 'Manifest business growth that serves people and stays values aligned.',
    script:
      'We set intention for businesses that are profitable and principled. We release growth strategies that ignore people, purpose, or long term health. Let innovation serve real needs and let teams thrive in cultures of trust. Guide leaders to make bold decisions with transparency. Bring clients who value quality and impact. We close committed to building enterprises that sustain families and strengthen communities.',
  },
  {
    id: 'ethical-wealth-manifestation',
    title: 'Ethical Wealth Manifestation',
    category: 'Abundance',
    durationMinutes: 15,
    body: 'Manifest wealth through integrity, stewardship, and meaningful contribution.',
    script:
      'We gather to manifest wealth that remains ethical in every stage. We release shortcuts and fear driven compromise. Let prosperity grow through integrity, useful service, and disciplined stewardship. Teach us to create value that honors clients and communities. Let increase fund generosity and future opportunity. Keep us humble in success and grounded in gratitude. We close aligned with abundance that is clean, sustainable, and beneficial.',
  },
  {
    id: 'grief-to-hope-healing-circle',
    title: 'Grief to Hope Healing Circle',
    category: 'Healing',
    durationMinutes: 10,
    body: 'Move gently from grief toward renewed hope and emotional strength.',
    script:
      'We hold grief with tenderness and honor every story of loss present here. We release pressure to heal quickly and choose compassionate patience instead. Let comfort meet us in quiet moments and community support us in practical ways. Restore appetite for life one small step at a time. Let hope return without erasing memory. We close carrying both love and courage for the path ahead.',
  },
  {
    id: 'spiritual-discernment-gathering',
    title: 'Spiritual Discernment Gathering',
    category: 'Spiritual Growth',
    durationMinutes: 5,
    body: 'Seek discernment for decisions, direction, and timing in this season.',
    script:
      'We gather for discernment in this season of decision. We release noise and pressure that cloud judgment. Let wisdom rise through stillness, truth, and trusted counsel. Help us recognize the next right step and walk it with confidence. We close attentive, clear, and surrendered to wise direction.',
  },
  {
    id: 'morning-momentum-intention-room',
    title: 'Morning Momentum Intention Room',
    category: 'Purpose',
    durationMinutes: 5,
    body: 'Set morning momentum for focus, discipline, and meaningful progress.',
    script:
      'We begin this morning with focused intention and grateful energy. We release scattered attention and choose a clear set of priorities for the day. Let discipline be steady and joyful. Let meaningful progress happen in small faithful steps. Keep our minds clear and our hearts peaceful in every task. We close ready to move with purpose and consistency.',
  },
  {
    id: 'evening-reflection-manifestation',
    title: 'Evening Reflection Manifestation',
    category: 'Gratitude',
    durationMinutes: 10,
    body: 'Reflect on the day, integrate lessons, and set intentions for tomorrow.',
    script:
      'We pause at day end to reflect with honesty and gratitude. We acknowledge what went well, what challenged us, and what we are learning through it all. We release regret that no longer serves growth and keep lessons that strengthen us. Let tomorrow begin with wiser choices and calmer energy. We give thanks for progress and unexpected grace. We close settled and ready for restorative rest.',
  },
  {
    id: 'collective-courage-event',
    title: 'Collective Courage Event',
    category: 'Confidence',
    durationMinutes: 15,
    body: 'Build collective courage for bold action in uncertain moments.',
    script:
      'We gather to cultivate courage together. We release hesitation rooted in fear of failure or criticism. Let bravery rise in practical action, truthful speech, and faithful decision making. Strengthen each person to face difficult conversations with grace and conviction. Let courage spread through teams and communities represented in this event. Replace avoidance with movement and doubt with grounded confidence. We close united in boldness and ready to act.',
  },
  {
    id: 'creative-problem-solving-hub',
    title: 'Creative Problem Solving Hub',
    category: 'Creativity',
    durationMinutes: 10,
    body: 'Manifest fresh solutions for complex problems with collaborative insight.',
    script:
      'In this hub we invite creative solutions for challenges that seem stuck. We release narrow thinking and open space for curiosity and collaboration. Let insights emerge from unexpected angles. Help us ask better questions, test practical ideas, and learn quickly from feedback. Guide teams toward solutions that are elegant and effective. We close energized, inventive, and ready to implement what we discovered.',
  },
  {
    id: 'healthy-boundaries-intention-room',
    title: 'Healthy Boundaries Intention Room',
    category: 'Relationships',
    durationMinutes: 5,
    body: 'Set intentions for healthy boundaries that protect peace and connection.',
    script:
      'We set intention for boundaries that protect peace and preserve love. We release guilt around saying no when no is wise. Let boundaries be clear, respectful, and consistent. Help us communicate limits without hostility and receive limits without offense. We close grounded in self respect and relational maturity.',
  },
  {
    id: 'sacred-union-manifestation',
    title: 'Sacred Union Manifestation',
    category: 'Relationships',
    durationMinutes: 15,
    body: 'Manifest sacred partnership rooted in trust, devotion, and shared growth.',
    script:
      'We gather with intention for sacred partnership and deep relational alignment. We release fear based attachment and patterns that block authentic intimacy. Let trust grow through honesty, patience, and mutual care. Bring partnerships that honor commitment and shared purpose. Strengthen existing unions with tenderness and clear communication. Let love mature beyond chemistry into faithful action. We close open to relationships that are wholehearted and life giving.',
  },
  {
    id: 'fertile-ideas-innovation-circle',
    title: 'Fertile Ideas Innovation Circle',
    category: 'Creativity',
    durationMinutes: 10,
    body: 'Nurture fertile ideas into viable innovations with clear execution.',
    script:
      'We hold space for fertile ideas that can become meaningful innovation. We release fear of experimentation and pressure to be perfect too soon. Let curiosity guide exploration and let structure guide execution. Give discernment to choose strongest ideas and courage to prototype quickly. Bring partners who sharpen thinking and strengthen delivery. We close committed to turning insight into useful results.',
  },
  {
    id: 'abundance-for-impact-gathering',
    title: 'Abundance for Impact Gathering',
    category: 'Abundance',
    durationMinutes: 15,
    body: 'Manifest abundance that multiplies impact across family and community.',
    script:
      'We gather to call in abundance that expands impact. We release the belief that prosperity and service are in conflict. Let increase come through honest work, wise partnerships, and consistent stewardship. Multiply resources so families can thrive and communities can be strengthened. Help us direct abundance toward education, healing, and opportunity for others. Keep gratitude active as growth comes. We close aligned with wealth that uplifts many lives.',
  },
  {
    id: 'recovery-and-renewal-room',
    title: 'Recovery and Renewal Room',
    category: 'Healing',
    durationMinutes: 10,
    body: 'Support recovery journeys with patience, courage, and practical support.',
    script:
      'We hold this room for every recovery journey, visible and unseen. We release shame and welcome compassionate accountability. Let healthy habits take root and old patterns lose their grip. Surround each person with trustworthy support and clear boundaries. Restore joy and confidence in the process of renewal. We close honoring progress and recommitting to one faithful step at a time.',
  },
  {
    id: 'inner-child-healing-event',
    title: 'Inner Child Healing Event',
    category: 'Healing',
    durationMinutes: 15,
    body: 'Heal early emotional wounds with compassion, safety, and integration.',
    script:
      'We enter this event with gentleness for younger parts of ourselves that still carry fear or unmet needs. We release self criticism and welcome compassionate presence. Let old wounds be seen with honesty and held with care. Restore safety in the body and trust in healthy connection. Help us integrate past pain into present wisdom without becoming trapped by it. Strengthen capacity for joy and secure attachment. We close grateful for each layer of restoration.',
  },
  {
    id: 'workplace-favor-intention-room',
    title: 'Workplace Favor Intention Room',
    category: 'Career',
    durationMinutes: 10,
    body: 'Call in favor, clarity, and mutual respect across workplace relationships.',
    script:
      'We set intention for favor and excellence in the workplace. We release tension, misunderstanding, and hidden competition. Let communication be direct and respectful. Let our contributions be seen and efforts rewarded fairly. Guide us to solve problems with creativity and composure. Build a culture of trust where teams can thrive. We close prepared to work with confidence and cooperative spirit.',
  },
  {
    id: 'legacy-building-manifestation',
    title: 'Legacy Building Manifestation',
    category: 'Purpose',
    durationMinutes: 15,
    body: 'Manifest a legacy of wisdom, service, and generational blessing.',
    script:
      'We gather to manifest legacy that outlives this moment. We release short term thinking and choose values that endure across generations. Let decisions today plant seeds of stability, wisdom, and blessing. Show us how to transfer knowledge, build systems, and strengthen communities. Keep us faithful in ordinary responsibilities that shape extraordinary outcomes. We close with long vision, humble hearts, and committed action for lasting impact.',
  },
  {
    id: 'physical-vitality-intention-circle',
    title: 'Physical Vitality Intention Circle',
    category: 'Wellbeing',
    durationMinutes: 5,
    body: 'Set intention for physical vitality, movement, and sustained energy.',
    script:
      'We set intention for renewed physical vitality. We release sluggish patterns and choose movement, hydration, and restorative habits that support life. Let energy rise in a balanced way throughout the day. Strengthen discipline around routines that nourish body and mind. We close alert, motivated, and grateful for the gift of health.',
  },
  {
    id: 'sacred-focus-deep-work-room',
    title: 'Sacred Focus Deep Work Room',
    category: 'Purpose',
    durationMinutes: 10,
    body: 'Manifest deep focus for meaningful work and sustained concentration.',
    script:
      'In this room we protect deep focus for meaningful work. We release distraction loops and fragmented attention. Let concentration deepen and time be used with precision. Help us complete what matters most before turning to what is merely urgent. Let minds remain calm and fully present in each task. We close prepared for deep work that produces excellent outcomes.',
  },
  {
    id: 'collective-thanksgiving-event',
    title: 'Collective Thanksgiving Event',
    category: 'Gratitude',
    durationMinutes: 5,
    body: 'Gather in shared thanksgiving to anchor unity and emotional uplift.',
    script:
      'We gather in collective thanksgiving for life, provision, and meaningful connection. We name gifts we have received and strength discovered through challenge. Gratitude unites us and softens our hearts toward one another. Let this spirit shape our homes, teams, and communities. We close joyful, humble, and ready to share kindness generously.',
  },
  {
    id: 'visionary-leadership-convergence',
    title: 'Visionary Leadership Convergence',
    category: 'Leadership',
    durationMinutes: 15,
    body: 'Converge around visionary leadership for ethical, scalable impact.',
    script:
      'We gather as leaders committed to vision that serves people well. We release reactive leadership and welcome strategic clarity with emotional maturity. Let long term thinking guide present action. Strengthen capacity to inspire teams, manage complexity, and make principled decisions under pressure. Bring unity around shared mission and courage around necessary change. We close ready to lead with wisdom, humility, and measurable impact.',
  },
  {
    id: 'abundant-harvest-intention-room',
    title: 'Abundant Harvest Intention Room',
    category: 'Abundance',
    durationMinutes: 10,
    body: 'Manifest abundant harvest from faithful effort and consistent sowing.',
    script:
      'We set intention for abundant harvest from seeds already planted. We release discouragement about slow progress and trust the power of consistent effort. Let what has been sown in discipline and service produce visible fruit. Help us recognize opportunities for wise expansion at the right time. Keep us grateful in increase and steady in responsibility. We close expecting meaningful harvest and prepared to steward it well.',
  },
  {
    id: 'manifestation-room-for-healing-economies',
    title: 'Manifestation Room for Healing Economies',
    category: 'Global',
    durationMinutes: 15,
    body: 'Set intention for fair economies that restore dignity and opportunity.',
    script:
      'We hold a global intention for economies that protect dignity and expand opportunity. We release systems built on exclusion and chronic instability. Let policymakers, founders, and community leaders collaborate with wisdom and courage. Let innovation reach those who have been overlooked. Guide resources toward equitable growth and practical support. We close this room committed to choices that create sustainable prosperity for all.',
  },
  {
    id: 'intention-room-for-clear-identity',
    title: 'Intention Room for Clear Identity',
    category: 'Spiritual Growth',
    durationMinutes: 10,
    body: 'Strengthen inner identity so choices flow from truth rather than fear.',
    script:
      'We gather to strengthen identity rooted in truth rather than fear. We release confusion that comes from constant comparison and outside pressure. Let inner clarity guide every decision and relationship. Teach us to honor our values with consistency and humility. Let confidence rise from integrity, not image. We close with stable identity and renewed courage for authentic living.',
  },
];
