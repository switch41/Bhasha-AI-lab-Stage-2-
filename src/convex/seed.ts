import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

const DEMO_DATA = {
  hindi: [
    { text: "अतिथि देवो भवः। अर्थात अतिथि को भगवान का दर्जा देना चाहिए। यह भारतीय संस्कृति का मूल मंत्र है।", contentType: "proverb" as const, region: "उत्तर प्रदेश", category: "culture", culturalContext: "This ancient Sanskrit proverb is central to Indian hospitality. It means 'The guest is God.'" },
    { text: "जैसा अन्न वैसा मन्न। अर्थात जैसा भोजन करते हैं वैसा ही मन और विचार बनते हैं।", contentType: "proverb" as const, region: "राजस्थान", category: "wisdom", culturalContext: "A Hindi proverb linking food quality to mental state, common in North Indian households." },
    { text: "सच्ची मित्रता वह है जो मुश्किल समय में काम आए। एक सच्चा दोस्त हमेशा आपके साथ खड़ा रहता है चाहे परिस्थिति कैसी भी हो।", contentType: "text" as const, region: "दिल्ली", category: "relationships" },
    { text: "एक बार की बात है, एक छोटे से गाँव में एक बूढ़ा किसान रहता था। उसके पास एक नीम का पेड़ था जिसके नीचे वह रोज़ बैठता था। गाँव के सभी बच्चे उसके पास आते और वह उन्हें कहानियाँ सुनाता।", contentType: "narrative" as const, region: "बिहार", category: "folktale", culturalContext: "A typical Indian village storytelling tradition where elders pass down wisdom through oral narratives." },
    { text: "जो लोग अपने सपनों का पीछा करते हैं, वे कभी हार नहीं मानते। कठिनाइयाँ आएँगी लेकिन धैर्य और मेहनत से सब कुछ संभव है।", contentType: "text" as const, region: "मुंबई", category: "motivation" },
    { text: "गाँव में होली के दिन का अलग ही उत्साह होता है। सुबह से ही लोग रंग लेकर निकल पड़ते हैं। ढोलक की थाप पर लोग नाचते हैं और एक दूसरे को गुलाल लगाते हैं।", contentType: "narrative" as const, region: "मथुरा", category: "festival", culturalContext: "Holi in Mathura is world-famous, celebrated at the birthplace of Krishna with unique fervor." },
  ],
  tamil: [
    { text: "கற்றது கைமண் அளவு, கல்லாதது உலகளவு. பொருள்: கற்றது மிகக் குறைவு, கல்லாதது மிக அதிகம்.", contentType: "proverb" as const, region: "தமிழ்நாடு", category: "education", culturalContext: "A famous Tamil proverb by poetess Avvaiyar, emphasizing humility in learning." },
    { text: "தமிழ் மொழி உலகின் மிகப் பழமையான மொழிகளில் ஒன்றாகும். இது 2000 ஆண்டுகளுக்கும் மேலான இலக்கிய வரலாற்றைக் கொண்டுள்ளது. சங்க இலக்கியம் தமிழின் சிறப்பை உலகறியச் செய்தது.", contentType: "text" as const, region: "சென்னை", category: "language" },
    { text: "ஒரு சிற்றூரில் ஒரு விவசாயி இருந்தான். அவன் நாள்தோறும் வயலுக்குச் சென்று உழைப்பான். ஒரு நாள் அவன் வயலில் ஒரு புதையலைக் கண்டுபிடித்தான். ஆனால் அது பொருட்குவியல் அல்ல; அது அறிவுக் குவியல்.", contentType: "narrative" as const, region: "மதுரை", category: "moral" },
    { text: "ஆறிலும் சுவைத்திடும் அன்னை மொழி தமிழே. எங்கும் நிறைந்திடும் இனியமொழி தமிழே.", contentType: "text" as const, region: "கோவை", category: "poetry" },
    { text: "ஊரை அறிய ஒருவன் போதும். நாட்டை அறிய நூறு போதும். உலகை அறிய ஆயிரம் போதும்.", contentType: "proverb" as const, region: "சேலம்", category: "wisdom", culturalContext: "A Tamil proverb about how perspective expands with exposure to more people and places." },
    { text: "பொங்கல் திருநாள் தமிழர்களின் மிகப்பெரிய திருவிழா. இது நான்கு நாட்கள் கொண்டாடப்படுகிறது. முதல் நாள் போகிப் பண்டிகை, இரண்டாம் நாள் பொங்கல், மூன்றாம் நாள் மாட்டுப் பொங்கல், நான்காம் நாள் காணும் பொங்கல்.", contentType: "narrative" as const, region: "தஞ்சாவூர்", category: "festival", culturalContext: "Pongal is the Tamil harvest festival, one of the most important celebrations in Tamil culture." },
  ],
  telugu: [
    { text: "ఆకలి రుచి ఎరుగదు, నిద్ర సుఖమెరుగదు. అర్థం: ఆకలిగా ఉన్నప్పుడు ఏదైనా తింటాం, నిద్రగా ఉన్నప్పుడు ఎక్కడైనా పడుకుంటాం.", contentType: "proverb" as const, region: "ఆంధ్రప్రదేశ్", category: "wisdom", culturalContext: "A Telugu proverb about how basic needs override comfort, common in rural Andhra." },
    { text: "తెలుగు తియ్యని భాష. అక్షరాలు చదవగానే తీయగా ఉంటాయి. తెలుగు వారికి తెలుగు అంటే ప్రాణం.", contentType: "text" as const, region: "తెలంగాణ", category: "language" },
    { text: "ఒక చిన్న గ్రామంలో రామయ్య అనే రైతు ఉండేవాడు. అతనికి రెండు ఆవులు ఉండేవి. ప్రతి రోజు అతను వాటికి గడ్డి వేసి, పాలు పితికేవాడు. గ్రామంలో అందరికీ పాలు పంచేవాడు.", contentType: "narrative" as const, region: "గుంటూరు", category: "village life" },
    { text: "పండగంటే సంక్రాంతి మర్చిపోలేము. ఇది తెలుగు వారి గొప్ప పండగ. ఈ రోజు కొత్త బట్టలు వేసుకుని, పెద్దలను కలిసి, హరిదాసులు వస్తారు.", contentType: "narrative" as const, region: "విశాఖపట్నం", category: "festival", culturalContext: "Sankranti is the most important festival for Telugu people, marked by kite flying and harvest celebrations." },
    { text: "చదువు లేని వాడు చీకటి గదిలో ఉన్నట్టే. విద్య వెలుగు ఇస్తుంది. ప్రతి బిడ్డకు విద్య అవసరం.", contentType: "text" as const, region: "కర్నూలు", category: "education" },
    { text: "ప్రతి మనిషిలోను ఒక ప్రత్యేకత ఉంటుంది. సమాజంలో ప్రతి ఒక్కరికి గౌరవం ఇవ్వాలి. అదే నిజమైన మానవత్వం.", contentType: "text" as const, region: "హైదరాబాద్", category: "society" },
  ],
  bengali: [
    { text: "জ্ঞান যেখানে সীমাবদ্ধ, বুদ্ধি সেখানে অন্ধ। অর্থাৎ জ্ঞানের সীমা থাকলে বুদ্ধি কাজ করে না।", contentType: "proverb" as const, region: "পশ্চিমবঙ্গ", category: "philosophy", culturalContext: "A famous Bengali proverb about the limitations of knowledge without wisdom." },
    { text: "বাংলা ভাষা ভারতের অন্যতম প্রধান ভাষা। রবীন্দ্রনাথ ঠাকুর বাংলা ভাষায় সাহিত্যে নোবেল পুরস্কার পেয়েছিলেন। বাংলা ভাষার মাধুর্য ও সমৃদ্ধি বিশ্ববিখ্যাত।", contentType: "text" as const, region: "কলকাতা", category: "language" },
    { text: "দুর্গাপুজো বাঙালির শ্রেষ্ঠ উৎসব। পাঁচ দিন ধরে চলে এই উৎসব। মহালয়া থেকে শুরু করে বিজয়া দশমী পর্যন্ত সর্বত্র আনন্দের বন্যা বইয়ে যায়।", contentType: "narrative" as const, region: "কলকাতা", category: "festival", culturalContext: "Durga Puja is the biggest festival for Bengalis, celebrating the goddess Durga's annual visit to her maternal home." },
    { text: "বাঙালির হাতে রয়েছে তিনটি বিশেষ দক্ষতা: খাওয়া, চলা, এবং নতুন কিছু শেখা। আর বাঙালির প্রিয় শখ হলো বই পড়া ও আড্ডা দেওয়া।", contentType: "text" as const, region: "শান্তিনিকেতন", category: "culture" },
  ],
};

export const seedDemoData = mutation({
  args: {
    languages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const languages = args.languages || Object.keys(DEMO_DATA);
    const contentIds: string[] = [];
    let totalSeeded = 0;

    for (const lang of languages) {
      const entries = DEMO_DATA[lang as keyof typeof DEMO_DATA];
      if (!entries) continue;

      for (const entry of entries) {
        const id = await ctx.db.insert("content", {
          userId: user._id,
          text: entry.text,
          language: lang,
          contentType: entry.contentType,
          region: entry.region,
          category: entry.category,
          culturalContext: entry.culturalContext || undefined,
          status: "published",
          qualityScore: 0.8,
          deletedAt: undefined,
        });
        contentIds.push(id);
        totalSeeded++;
      }
    }

    return { seeded: totalSeeded, contentIds };
  },
});
