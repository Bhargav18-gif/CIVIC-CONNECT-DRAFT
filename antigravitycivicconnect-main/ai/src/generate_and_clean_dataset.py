"""
CivicConnect Admin Task Classifier - High-Diversity 10,000 Dataset Generator & Quality Engine
Generates exactly 10,000 unique, clean, and balanced complaints across 8 municipal departments
(1,250 per department) with realistic Indian civic terminology, multi-style phrasings,
borderline cases, and strict deduplication.
"""

import os
import re
import csv
import json
import random
import hashlib
from pathlib import Path
from collections import defaultdict, Counter

random.seed(42)

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "dataset"
GENERATED_DIR = DATASET_DIR / "generated"
CLEANED_DIR = DATASET_DIR / "cleaned"

DEPARTMENTS = [
    "Roads",
    "Water",
    "Electricity",
    "Sanitation",
    "Drainage",
    "Traffic",
    "Public Health",
    "Municipal Services",
]

TARGET_PER_DEPT = 1250
TOTAL_TARGET = 10000

# Indian civic location pool (generic, distributed across wards, colonies, layouts, landmarks)
LOCATIONS = [
    "near {landmark}",
    "on {road_type}",
    "outside {building}",
    "at {junction}",
    "in {colony}",
    "opposite {landmark}",
    "along {road_type}",
    "behind {building}",
    "at Ward {ward}",
    "near {colony} main gate",
    "on {road_type}, Ward {ward}",
    "close to {landmark}",
    "right in front of {building}",
    "at the entry of {colony}",
    "between {colony} and {junction}",
]

LANDMARKS = [
    "bus stop", "metro pillar 142", "railway level crossing", "civil hospital gate",
    "government high school", "central vegetable market", "SBI ATM", "community hall",
    "fire station", "post office", "overhead water tank", "police station",
    "public park gate", "town hall", "junction roundabout", "milk booth",
    "weekly bazaar ground", "bridge underpass", "flyover landing", "primary health centre",
    "auto rickshaw stand", "district library", "pedestrian subway", "crematorium ground",
    "electricity sub-station", "grain mandi", "temple road", "mosque corner",
    "church square", "bazaar circle", "rotary circle", "clock tower",
    "bus terminus", "toll plaza", "petrol pump", "railway station approach",
    "industrial estate gate", "APMC market yard", "slaughterhouse cross", "service road turn"
]

ROAD_TYPES = [
    "Main Road", "80 Feet Road", "Ring Road", "Link Road", "Station Road",
    "Bypass Road", "Market Road", "Service Lane", "Inner Circular Road",
    "Hospital Road", "College Road", "Temple Street", "Cross Road 4",
    "4th Cross, 2nd Main", "100 Feet Intermediate Road", "NH Bypass Service Road",
    "6th Cross Avenue", "Church Road", "Station Approach Road", "GIDC Road"
]

BUILDINGS = [
    "Govt Primary School", "Co-operative Bank", "ESI Hospital", "Ward Office",
    "Muncipal Community Hall", "Civil Court", "Ration Shop", "Maternity Clinic",
    "Govt Girls Hostel", "Fire Brigade Station", "Taluk Office", "Sub-Registrar Office",
    "Kendriya Vidyalaya", "State Transport Depot", "City Library", "Fish Market Yard",
    "District Veterinary Hospital", "Railway Staff Colony", "Urban Health Post"
]

JUNCTIONS = [
    "Gandhi Circle", "Ambedkar Chowk", "Shivaji Circle", "Nehru Roundabout",
    "Station T-Junction", "Market Four Roads", "Highway Junction", "Clock Tower Square",
    "Bypass Intersection", "Old Post Office Junction", "Collectorate Circle", "Ashok Pillar Crossing",
    "Subhash Nagar Crossing", "Indira Circle", "Patel Chowk", "University Cross"
]

COLONIES = [
    "Shastri Nagar", "Adarsh Layout", "Vivekananda Colony", "Rajaji Sector 3",
    "Kasturba Extension", "Gandhi Gram", "Netaji Nagar", "Tilak Road Extension",
    "Green Glen Layout", "Santosh Nagar", "Vikas Enclave", "Pragati Colony",
    "Surya Nagar Ward 12", "Ramakrishna Puram", "Bhavani Nagar", "Ashok Vihar Phase 2",
    "Balaji Layout", "Siddhartha Nagar", "Mahalakshmi Layout", "Kuvempu Nagar",
    "Indira Gandhi Colony", "Vinayaka Nagar", "Sri Krishna Layout", "Teachers Colony",
    "Telecom Colony", "Postal Layout", "Defence Enclave", "Vidya Nagar"
]

# Style templates for citizen submissions:
# 1. Short / Alert
# 2. Detailed / Descriptive
# 3. Urgent / Emotional
# 4. Indian-English colloquial
# 5. Formal / Civic letter style
# 6. Typo / Imperfect grammar style

DEPARTMENT_KNOWLEDGE = {
    "Roads": {
        "cores": [
            ("massive pothole filled with stagnant rainwater", "causing two-wheelers to slip and fall"),
            ("huge crater right in the middle of the road", "posing fatal risk to night motorists"),
            ("asphalt layer completely peeled off leaving sharp stones", "damaging vehicle suspensions and tires"),
            ("deep trench excavated for laying cables left unpaved", "no barricade placed and vehicles falling inside"),
            ("road caved in creating a 3-foot deep sinkhole", "half the carriage width blocked dangerously"),
            ("broken concrete speed breaker with exposed sharp iron rods", "puncturing tires and injuring cyclists"),
            ("severe corrugation and uneven road surface", "buses and autos tilting dangerously"),
            ("tar washed away completely after recent downpour", "creating hazardous slippery mud slush"),
            ("sunken utility trench running across the entire roadway", "causing sudden violent jerks to vehicles"),
            ("loose gravel scattered all over the newly laid asphalt", "two-wheelers skidding frequently on brakes"),
            ("footpath pavers broken, dislodged and jutting out", "pedestrians and senior citizens tripping constantly"),
            ("road shoulder eroded into a 2-foot sharp drop-off", "cars sliding into the roadside mud ditch"),
            ("deep ruts formed by overloaded trucks on hot asphalt", "making bike handling extremely unstable"),
            ("missing asphalt patch around drainage manhole frame", "protruding rim smashing car oil sumps"),
            ("collapsed retaining edge along road margin", "risk of road shoulder caving into adjacent ravine"),
            ("concrete pavement slabs shattered and unevenly sunken", "wheelchairs and prams cannot pass"),
            ("freshly laid bituminous surface crumbling within a week", "poor quality road construction exposed"),
            ("unmarked illegal cement speed ramp constructed by locals", "vehicles bottoming out and riders falling"),
            ("multiple deep potholes spanning the entire width of lane", "traffic forced to crawl at 5 km/h"),
            ("road trench backfilled only with loose mud which has now sunken", "causing car wheels to get stuck"),
            ("slippery oil and gravel mix spread across asphalt surface", "frequent skidding accidents reported"),
            ("substandard patch work washed away leaving larger holes", "road condition worse than before repair"),
            ("sharp stones and unrolled road ballast scattered across lane", "hazardous for cyclists and pedestrians"),
            ("severely cracked asphalt web expanding across both lanes", "road surface breaking down rapidly"),
            ("road level difference between old and new asphalt patch", "creating sharp 4-inch ridge across lane")
        ],
        "colloquial": [
            "road is fully damaged and full of big potholes",
            "plz repair this road immediately bike riders falling daily",
            "worst road condition not even able to walk properly",
            "huge pit on road no warning board kept very dangerous at night",
            "recently road was laid now fully broken and stones coming out",
            "pothole depth is more than 1 foot any time major accident can happen",
            "entire stretch is totally unmotorable please do tarring work",
            "auto drivers refusing to come because of pathetic road condition",
            "road has caved in middle of road heavy vehicles getting stuck",
            "dangerous speed breaker without white zebra stripes riders getting hurt"
        ],
        "typos": [
            "huge pot hole on roadd please repaire urgently",
            "rad suface totly brokn vehicle geting damag",
            "deep pthle after rain two wheeler skiding daily",
            "spid braker iron rod exposd dangerous for bikes",
            "road cav in happend danger for citisens kindly fix"
        ]
    },

    "Water": {
        "cores": [
            ("drinking water pipeline burst with high-pressure fountain", "millions of liters of clean water being wasted"),
            ("zero municipal drinking water supply for the past five consecutive days", "residents forced to purchase expensive private tankers"),
            ("tap water coming extremely muddy, brown, and foul-smelling", "completely unfit for cooking and consumption"),
            ("water supply pressure is drastically low", "water not reaching overhead tanks on first floor"),
            ("underground drinking water main leaking continuously", "water pooling on surface while taps remain completely dry"),
            ("drinking water contaminated with sewage smell and black particles", "several residents suffering from stomach infections"),
            ("municipal water supply valve broken and jammed in closed position", "entire lane deprived of scheduled water supply"),
            ("drinking water pipeline fractured during JCB road excavation", "huge volume of water flooding the colony street"),
            ("erratic water supply timing releasing water at 2:30 AM without notice", "working families unable to collect drinking water"),
            ("public drinking water tap leaking non-stop 24 hours a day", "clean potable water flowing down into gutter"),
            ("municipal borewell pump motor burned out and not replaced", "colony community tap dry for over a week"),
            ("water meter spinning rapidly due to air pockets but delivering zero water", "erroneous excessive billing generated"),
            ("drinking water supply line air-locked preventing water flow to households", "no water coming out of taps despite supply hours"),
            ("municipal water tanker did not arrive as per scheduled distribution", "slum cluster left without single drop of drinking water"),
            ("rusted municipal water pipe leaking chlorinated water into foundations", "dampness threatening structural integrity of houses"),
            ("foul kerosene-like chemical smell in municipal tap water", "drinking water suspected to be chemically polluted"),
            ("damaged distribution pipeline joint near water reservoir", "continuous gush of potable water flooding street"),
            ("drinking water pressure completely collapsed since valve repair work", "unable to fill basic domestic buckets"),
            ("worms and insect larvae visible in municipal tap water supply", "gross hygiene failure in public drinking supply"),
            ("broken municipal air release valve spraying drinking water into air", "surrounding properties getting waterlogged with clean water"),
            ("community drinking water cooler unit out of order and dry", "daily commuters and pedestrians left without water in heat"),
            ("unauthorized puncture on municipal drinking water main line", "illegal water diversion causing acute shortage downstream"),
            ("water supply duration reduced to just 15 minutes every alternate day", "insufficient volume to meet basic household drinking needs"),
            ("mud and silt coming through kitchen taps after water line repair", "sediment choking domestic water filters"),
            ("municipal drinking water overhead tank overflowing for hours unattended", "float valve failure wasting potable water reservoir")
        ],
        "colloquial": [
            "no water coming in taps since last 4 days kindly supply tanker",
            "water pressure is very low not even filling one bucket in 1 hour",
            "drinking water is coming dirty and smelling like drainage",
            "main water pipe is broken drinking water running on road wastefully",
            "tap water is full yellow color cannot drink or use for cooking",
            "water supply timing is very irregular please give water on fixed schedule",
            "colony borewell motor spoiled please send mechanic urgently",
            "drinking water line damaged during road work please repair immediately",
            "water tanker driver demanding extra money and not giving full water",
            "our ward getting only 20 mins water while other areas getting 2 hours"
        ],
        "typos": [
            "drnking watr not comming in taps since 3 days",
            "pipelin brok clean watr wasting on road fix fast",
            "wter presure to low tps runing dry pleas help",
            "tap watr is smeling bd and dirty colr husehold prblm",
            "watertanker did not cm today peopl strugling for watr"
        ]
    },

    "Electricity": {
        "cores": [
            ("transformer sparking violently with loud explosion noises", "sparks falling directly on nearby parked cars and pedestrians"),
            ("overhead high tension power cable snapped and dangling near ground", "extreme electrocution danger to school students"),
            ("entire streetlights along the 2 km stretch completely dark for weeks", "female commuters and pedestrians feeling unsafe at night"),
            ("electric pole severely leaning at 45 degrees toward residential house", "heavy concrete pole may collapse during windstorm"),
            ("open electrical junction feeder pillar with exposed 440V live busbars", "children playing nearby at grave risk of fatal shock"),
            ("continuous acute voltage fluctuations from 140V to 290V", "household refrigerators, TVs and motors getting damaged"),
            ("transformer oil leaking heavily onto the public pavement", "transformer overheating and producing burning smell"),
            ("unannounced power blackout lasting over 14 hours in extreme summer heat", "senior citizens and infants facing severe distress"),
            ("streetlight timer broken causing lights to stay ON in afternoon and OFF at night", "energy wasted by day while road is dark at night"),
            ("tree branches heavily tangled with bare 11kV electrical conductors", "frequent sparks and localized power tripping during breeze"),
            ("rusted bottom of street electric pole ready to snap at base", "pole supported only by tension of overhead wire cables"),
            ("underground electrical power cable fault plunging entire block into darkness", "business shops and residential units without electricity"),
            ("frequent phase-out condition leaving households with single-phase low voltage", "water lifting pumps and fans unable to operate"),
            ("electrical meter box on public utility pole burst into flames", "fire hazard threatening adjacent residential power connections"),
            ("low-hanging service electricity wire drooping across road carriage", "trucks and double-decker buses getting caught in cables"),
            ("fuse repeatedly blowing out on distribution transformer every evening", "load capacity insufficient for local consumer demand"),
            ("broken streetlight glass luminaire hanging precariously by thin wire", "heavy fixture ready to drop on passing traffic"),
            ("neutral wire disconnection causing dangerous 400V surge in homes", "appliances burning and smoke billowing from wall sockets"),
            ("temporary electric wire hanging without insulation across open footpath", "grave hazard during rain puddles"),
            ("transformer enclosure fence broken allowing stray cattle near high voltage", "serious public safety violation"),
            ("flickering streetlights causing seizure risk and strobing effect on highway", "drivers experiencing disorientation and headlight glare"),
            ("power company feeder switch tripped and sub-station staff not responding", "unattended blackout entering second day"),
            ("electric shock felt when touching municipal streetlight iron pole", "earthing defect current leaking into metallic body"),
            ("overhead jumper wire disconnected on utility pole causing partial blackout", "half the residential colony in darkness"),
            ("overloaded distribution transformer smoking and buzzing loudly", "imminent failure risk requiring emergency capacity upgrade")
        ],
        "colloquial": [
            "street light is not working in our lane full dark at night",
            "transformer giving big blast sound and sparks falling down",
            "electric wire is hanging very low anyone can get current shock",
            "power cut since morning no current in our whole colony",
            "electric pole is bent dangerously can fall any time please remove",
            "voltage is very low fan is not running fridge making weird sound",
            "open electric DP box on road children are playing nearby please lock it",
            "street light burning in afternoon time and turning off at 7 PM night",
            "phase missing in our house only half lights working please fix fuse",
            "shock is coming from street light pole when touching it very scary"
        ],
        "typos": [
            "stret lite not glowing ful dark rad at nyt",
            "electrik wir cut and hangin dngrously on stret",
            "trnsfrmer spakring big blast noiz plz snd elctrician",
            "powrcut since 12 hrs no electrsity in ward",
            "voltaj fluktuashun damging tv and ac kindly check"
        ]
    },

    "Sanitation": {
        "cores": [
            ("massive open garbage dump accumulated on the roadside", "stray dogs and cattle scattering rotting waste across the road"),
            ("municipal garbage collection dumper bin overflowing for over ten days", "stinking waste spilling onto footpath and blocking pedestrian walk"),
            ("door-to-door waste collection vehicle has not visited the ward for two weeks", "residents forced to pile up household garbage on street corners"),
            ("illegal dumping of commercial restaurant food waste and chicken offal", "intolerable rotting stench making it impossible to breathe"),
            ("hazardous biomedical waste including syringes and bandages dumped in open plot", "severe biohazard threat to neighborhood children"),
            ("dead dog carcass rotting on the roadside for three days", "insects swarming and foul stench spreading across 200 meters"),
            ("garbage sweepers burning piles of dry leaves and plastic trash in public park", "toxic thick smoke suffocating morning walkers and asthma patients"),
            ("construction debris and concrete rubble illegally dumped along the road curb", "narrowing carriageway and creating hazardous road dust"),
            ("broken and overturned municipal litter bin with waste spilling everywhere", "pedestrians walking into littered food packets and cups"),
            ("vegetable and fish market waste rotting in open open drains and road shoulders", "attracting hundreds of stray pigs, crows, and flies"),
            ("electronic waste and broken battery parts dumped near residential pond", "toxic lead and acid runoff threatening soil contamination"),
            ("sanitation truck leaking putrid black garbage leachate along the entire road", "slick smelly trail causing motorcycle riders to slip"),
            ("unauthorized waste sorting and burning yard operating in residential area", "pungent plastic fumes enveloping neighboring apartment blocks"),
            ("dead cow lying near the highway bridge approach unattended", "maggots infesting carcass and causing public disgust"),
            ("public market dustbins damaged, rusted, with bottom completely missing", "garbage dumped inside falls straight onto road surface"),
            ("sanitation worker skipping daily street sweeping on inner residential roads", "dry leaves, plastic bags, and dust accumulating in thick layers"),
            ("dumping of industrial chemical sludge bags on vacant municipal land", "acrid chemical fumes causing throat irritation to residents"),
            ("open meat stall dumping entrails and bones on public sidewalk", "severe nuisance and stray canine pack aggression"),
            ("massive accumulation of single-use plastic cups and plates after festival", "no sanitation crew deployed for cleanup post-event"),
            ("commercial hotel dumping grease, oil, and spoiled food into open corner", "grease attracting large rodents and creating slippery mess"),
            ("overflowing garbage pile blocking access to government school main gate", "students forced to step over rotten food waste to enter"),
            ("dead stray cat decaying under roadside culvert", "overwhelming stench penetrating ground floor residences"),
            ("sanitation collection vehicle demanding cash bribes to lift segregated waste", "refusing collection if unpaid"),
            ("illegal burning of discarded rubber tires and wire cables at night", "thick black toxic soot covering homes and clothes"),
            ("spilled garbage not cleared after mechanical dumper truck emptied bin", "half the waste left scattered on the asphalt road")
        ],
        "colloquial": [
            "garbage is not being lifted since one week huge smell coming",
            "dustbin is totally overflowing dogs spreading trash everywhere",
            "dead animal lying on road please send sanitation team to remove",
            "sanitation auto not coming to our street trash piled up in homes",
            "people throwing garbage bags on vacant plot creating mini dumpyard",
            "someone burning plastic garbage in night time suffocating smoke",
            "fish market waste thrown on road intolerable rotten stench",
            "garbage truck leaking dirty black liquid on entire road smelling awful",
            "sweeper is sweeping dust into open drain instead of lifting it",
            "no dustbin provided in our market area people throwing waste on street"
        ],
        "typos": [
            "garbag not colected since many days big sml",
            "ovrflowin dustbin dogs scatring west on rad",
            "ded animal dog lying on roadd please remuv it",
            "plasic west burnig smuk entring insid house",
            "swpr not cmng to cleen stret wast accumulatd"
        ]
    },

    "Drainage": {
        "cores": [
            ("stormwater drain completely choked with solid silt and plastic debris", "even light drizzle causing 2 feet of stagnant road waterlogging"),
            ("raw sewage overflowing from choked underground sewer manhole", "black contaminated fecal water bubbling onto public road"),
            ("heavy concrete manhole cover broken and collapsed into sewer line", "open 10-foot deep death trap left without warning barricade"),
            ("drainage pipe cracked and leaking foul sewage water into building foundations", "stink and dampness seeping through basement walls"),
            ("monsoon drain blocked causing rainwater to flood into ground floor homes", "furniture, groceries, and household goods submerged in sewage water"),
            ("open storm gutter without covering slab running in front of primary school", "students at constant risk of slipping into deep muddy drain"),
            ("underground sewer pipeline choked with tree roots and grease accumulation", "toilets on ground floor residences backing up and gurgling"),
            ("culvert under link road collapsed and choked with construction debris", "stormwater unable to pass and creating vast upstream lake"),
            ("missing drainage iron grating on roadside stormwater inlet", "bicycle wheels and motorcycle tires falling into open drain slot"),
            ("open sewer drain overflowing into residential colony walking street", "residents forced to step on makeshift bricks to leave homes"),
            ("drainage desilting sludge left piled on roadside instead of being removed", "drying sewage sludge washing back into drain with next rain"),
            ("roadside gutter wall broken causing sewage to seep into adjacent soil", "eroding the road base and causing asphalt edge to collapse"),
            ("septic sewer line connected illegally into open stormwater surface drain", "pure raw sewage flowing in open air through residential sector"),
            ("deep drain construction trench left abandoned without safety boards", "water collecting inside and turning into stagnant breeding pool"),
            ("manhole cover displaced by floodwater left open in middle of flooded lane", "submerged open hole completely invisible to drivers"),
            ("sluggish sewer flow causing toxic methane and hydrogen sulfide gas buildup", "foul sewer gas emanating through residential bathroom sinks"),
            ("narrow culvert diameter unable to handle runoff from new residential layouts", "regular flash flooding every time it rains"),
            ("drainage outfall into main canal blocked by collapsed retaining wall", "backwater flooding low-lying residential slums"),
            ("storm drain choked with discarded mattress, thermocol and plastic crates", "complete stoppage of rainwater discharge"),
            ("sewer line burst underground saturating road pavement with foul water", "macadam road sinking and bubbling with sewage effluent"),
            ("drain grate covered with asphalt during hasty road resurfacing work", "rainwater has no entry point into storm drainage network"),
            ("concrete slab of roadside drain broken under weight of delivery truck", "open gap exposing deep black drain sludge"),
            ("sewer cleaning suction jetting machine needed for persistent pipeline blockage", "manual rodding failed to clear compacted silt"),
            ("waterlogging on subway underpass reaching 4 feet depth due to pump failure", "subway closed and traffic diverted for miles"),
            ("uncovered stormwater drain running parallel to market footpath", "shoppers accidentally dropping belongings and slipping in sewage")
        ],
        "colloquial": [
            "drain is overflowing sewage water coming into our house compound",
            "gutters are fully blocked with mud road is flooded with knee deep water",
            "manhole cover is missing open hole on road very dangerous in night",
            "rain water has nowhere to go road becomes a river every small rain",
            "drainage smell is terrible in our lane please clean the gutter",
            "sewage line is choked toilets are overflowing in ground floor flats",
            "broken manhole slab car wheel got stuck please replace cover",
            "drain silt was cleaned and left on road now all gone back in drain",
            "underpass is flooded with dirty water cars getting stuck in water",
            "open drain in front of our gate school children can fall inside"
        ],
        "typos": [
            "drange is chokd sewag watr floding rad",
            "manhol covr missin open pit dangrous for walkrs",
            "watr loging knee dep aftr smal rain no drange outlt",
            "guter overflowin ful stenk in residental aera",
            "sewer lin blokd toilts runing bckward kindly clen"
        ]
    },

    "Traffic": {
        "cores": [
            ("traffic signal lights completely dead at busy four-road junction", "vehicles crossing from all four sides creating chaotic gridlock"),
            ("traffic signal timer stuck on permanent green on one side and red on other", "causing 45-minute standstill and road rage among commuters"),
            ("pedestrian zebra crossing paint completely faded and invisible", "pedestrians and senior citizens unable to cross safely without risk"),
            ("heavy multi-axle cargo trucks illegally parked in designated bus bay", "city buses forced to stop in middle lane blocking entire traffic"),
            ("concrete median road divider broken and knocked down by collision", "vehicles making dangerous unauthorized U-turns across oncoming lane"),
            ("mandatory stop and directional road signs twisted and hidden by tree branches", "unfamiliar drivers missing turn and driving into one-way traffic"),
            ("absence of speed limit signs and rumble strips near school zone crossing", "speeding heavy vehicles endangering crossing schoolchildren"),
            ("damaged crash barrier on highway flyover curve", "leaving dangerous open edge overlooking 30-foot drop to road below"),
            ("traffic CCTV surveillance camera dangling by wire from signal pole", "equipment knocked down by oversized container truck"),
            ("illegal auto-rickshaw and taxi parking encroaching two lanes of major junction", "choking peak-hour traffic flow to a crawl"),
            ("traffic blinker beacon at blind intersection not operating", "frequent T-bone vehicle collisions occurring at night"),
            ("missing reflective cat-eyes and lane divider markings on unlit bypass road", "drivers struggling to judge lane boundaries in fog and dark"),
            ("traffic diversion sign boards left on roadway weeks after road work ended", "creating unnecessary bottleneck and driver confusion"),
            ("damaged flexible traffic bollards uprooted and lying scattered across junction", "vehicles driving over median kerb"),
            ("haphazard commercial loading and unloading blocking arterial road during morning peak", "ambulances and school buses trapped in jam"),
            ("defective countdown timer on traffic lights skipping from 60 to 0 seconds", "sudden panic braking causing rear-end collisions"),
            ("missing height barrier at low railway bridge underpass", "tall container trucks regularly getting wedged under bridge"),
            ("unauthorized gap cut into road median divider by local shopkeepers", "motorcycles cutting across oncoming 60 km/h traffic"),
            ("blind curve on hill road lacking convex safety mirror and warning signs", "head-on near misses reported daily"),
            ("pedestrian push-button crossing signal out of order", "pedestrians waiting 20 minutes to cross busy six-lane avenue"),
            ("traffic signal lens covers broken with red and green lights showing together", "extreme confusion at major intersection"),
            ("faded stop line causing vehicles to stop directly inside pedestrian crossing", "walkers forced to weave between idling cars and motorcycles"),
            ("damaged speed governor warning sign lying flat on road shoulder", "lack of signage encouraging overspeeding near hospital gate"),
            ("commercial delivery vans double parking along narrow market street", "single lane traffic bottleneck backing up for kilometers"),
            ("missing one-way entry sign board leading to head-on gridlock", "vehicles entering from wrong direction continuously")
        ],
        "colloquial": [
            "traffic signal is not working big traffic jam at junction",
            "signal timer is too short only 10 seconds green for huge traffic",
            "vehicles parked illegally on both sides of road blocking bus movement",
            "divider is broken cars taking dangerous u-turn causing accidents",
            "no zebra crossing for pedestrians impossible to cross this wide road",
            "road sign is hidden behind tree branches motorists missing the turn",
            "speed breaker warning sign missing drivers jumping speed breaker at high speed",
            "autos and taxis blocking the entire left turn free lane",
            "yellow blinker light not working at accident prone cross road",
            "traffic police needed at circle during school hours heavy jam"
        ],
        "typos": [
            "trafic signl not workin huge jam at chawk",
            "illegl parkng blockng entir stret buses stck",
            "dividr cut made illeagli bikes crosing dngrously",
            "no zebr crosing pedstrians strugling to cros",
            "signl timr is stck on red plese repare fast"
        ]
    },

    "Public Health": {
        "cores": [
            ("massive swarms of mosquitoes breeding in stagnant open sewage ponds", "multiple confirmed cases of dengue, malaria and chikungunya in ward"),
            ("foul, nauseating stench from illegal poultry processing unit near residential school", "students complaining of severe headaches and vomiting"),
            ("unauthorized pig and cattle rearing in residential layout creating filthy unhygienic conditions", "tick infestation and intolerable dung odor spreading"),
            ("public toilet facility abandoned with choked pans and no running water", "feces overflowing creating severe public biological hazard"),
            ("stray dog pack showing symptoms of rabies and aggressively chasing residents", "multiple dog bite incidents reported in the past 48 hours"),
            ("unhygienic road-side eatery washing plates in dirty drain water", "food poisoning outbreak reported among local college students"),
            ("industrial chemical effluent being discharged into open residential storm canal", "acrid fumes causing respiratory distress and eye irritation"),
            ("pest and rat infestation multiplying rapidly around abandoned grain godown", "rodents entering nearby homes and gnawing electric wires"),
            ("stagnant green slime water pooled in empty construction basement", "acting as massive breeding nursery for vector-borne disease mosquitoes"),
            ("urgent vector fogging and anti-larval chemical spraying needed in colony", "dengue fever spreading from house to house"),
            ("unauthorized medical dispensary discarding used syringes and blood tubes into open lot", "grave danger of Hepatitis and HIV contamination"),
            ("illegal animal slaughtering taking place in open street corner", "blood, offal, and animal parts attracting packs of scavenger dogs"),
            ("stray dog carcass left unburied near community water handpump", "biological contamination of shallow ground water table"),
            ("foul hydrogen sulfide gas leaking from open municipal drain near hospital", "patients experiencing breathing difficulties in recovery wards"),
            ("contaminated water from burst sewage line seeping into shallow drinking wells", "gastroenteritis outbreak affecting over twenty families"),
            ("unhygienic open defecation taking place along railway tracks due to lack of toilets", "health hazard and loss of dignity for community"),
            ("swarm of honeybees built massive hive on public walkway tree", "multiple pedestrians stung including school children"),
            ("illegal chemical bone crushing unit emitting sickening odor throughout night", "residents unable to sleep with windows open"),
            ("dumped rotten grain and spoiled potatoes producing noxious fermentation gases", "severe health risk to residents with respiratory conditions"),
            ("open garbage dump attracting thousands of bluebottle flies entering kitchens", "cholera and dysentery risk in slum settlement"),
            ("stagnant rainwater collected in discarded scrap tires outside repair shop", "proven high-density breeding site for Aedes dengue mosquitoes"),
            ("dead pigeons decomposing inside public building central ventilation shafts", "foul stench and bird flu biohazard circulating through AC"),
            ("hospital medical waste incinerator emitting thick black soot without filter", "toxic dioxin fumes settling on surrounding residential rooftops"),
            ("open septic tank uncovered behind community center", "imminent drowning and asphyxiation hazard for young children"),
            ("illegal sale of stale, artificially colored food items outside school gate", "children falling sick with acute abdominal cramps")
        ],
        "colloquial": [
            "too many mosquitoes in our area dengue cases increasing please fog",
            "terrible smell from open drain and stagnant water causing vomiting",
            "stray dogs are biting people on street please catch them urgently",
            "public toilet is filthy and overflowing nobody cleaning it since weeks",
            "hotel throwing rotten food and chicken waste attracting flies and rats",
            "anti-larval spray not done in our ward malaria spreading fast",
            "chemical smoke and bad smell coming from factory at night cannot breathe",
            "dirty open drain next to school children getting sick frequently",
            "rabid aggressive dog roaming in market area bit two children today",
            "open slaughter of animals in street blood running on road very unhygienic"
        ],
        "typos": [
            "to mny mosquitos dangue spreding plz du fogin",
            "publk toilt is verry dirti no watr smeling awful",
            "stry dogs bitng peple agreshive paks kindly cach",
            "unhygenic foud stall causng stumach infaction",
            "stagnnt wter breedng mosquitos chkungunya risk"
        ]
    },

    "Municipal Services": {
        "cores": [
            ("children playground swings, slides and see-saws broken with sharp rusted metal", "children getting cut and injured during play in public park"),
            ("huge dried-up eucalyptus tree leaning precariously over residential house", "branches ready to crush roof during impending monsoon storm"),
            ("municipal community hall online booking portal showing payment debited but booking failed", "citizens losing money with no confirmation"),
            ("public library reading hall ceiling leaking heavily during rain", "valuable reference books and wooden tables getting water damaged"),
            ("gas and electric furnace at municipal crematorium out of order", "bereaved families forced to wait over eight hours with mortal remains"),
            ("public park walking track paver tiles uprooted by banyan tree roots", "elderly citizens tripping and suffering fractures during morning walks"),
            ("ornamental central town fountain dried up, rusted, and full of weeds and trash", "historical municipal landmark left in derelict state"),
            ("outdoor open gym equipment in public park completely rusted and jammed", "bearings seized and metal frame loose at concrete foundation"),
            ("boundary wall of municipal cemetery collapsed allowing stray animals inside", "desecration of graves and lack of basic civic dignity"),
            ("municipal ward administrative office closed during designated public grievance hours", "citizens standing in queue for hours without staff"),
            ("vandalized public park benches with broken stone slabs and missing wooden slats", "senior citizens have no place to sit and rest"),
            ("overgrown wild thorny bushes and weeds on municipal civic plot", "harboring venomous snakes and breeding stray rodents"),
            ("heritage public clock tower clock hands broken and dial vandalized", "historical civic monument in complete disrepair"),
            ("public park security gate missing and boundary iron railings stolen", "anti-social elements drinking alcohol inside children park at night"),
            ("fallen tree trunk blocking entire public promenade after storm", "municipal tree cutting crew has not cleared heavy wood for days"),
            ("drinking water cooler installed in municipal office complex dead and dry", "visitors arriving for property tax work left without water"),
            ("community notice board glass shattered and public civic circulars torn", "citizens unable to view official municipal welfare announcements"),
            ("municipal nursery security fencing torn allowing illegal encroachment", "valuable plant saplings and trees destroyed by cattle"),
            ("shade gazebo roof in municipal rose garden collapsed under rain weight", "broken wooden beams hanging hazardously over seating area"),
            ("public auditorium sound acoustic panels and ceiling tiles falling down", "severe safety hazard during municipal cultural programs"),
            ("automatic sprinkler system in public park broken and shooting water into street", "park lawns drying out while road is needlessly flooded"),
            ("municipal swimming pool filtration plant broken with green algae bloom", "water turned toxic and facility shut down for months"),
            ("public park solar lights stolen and battery storage boxes smashed open", "entire garden pitch black after 6:30 PM"),
            ("birth and death certificate online municipal portal throwing 500 server errors", "citizens unable to obtain urgent official documentation"),
            ("municipal tree trimming crew cut branches and left heavy wood debris on footpath", "blocking pedestrian path and forcing walkers onto busy road")
        ],
        "colloquial": [
            "park swings are broken iron slide has sharp cut children getting hurt",
            "big dry tree branch can fall on our house roof please cut it urgently",
            "crematorium furnace not working people waiting with dead body in grief",
            "public park gate is broken drunkards entering at night and breaking benches",
            "municipal ward office staff not available during public complaint hours",
            "open gym machines in garden are rusted and jammed not moving at all",
            "public library roof is leaking rainwater books getting ruined please repair",
            "cemetery boundary wall fell down stray dogs entering graveyard",
            "storm felled a big tree across lane please send municipal chainsaw team",
            "park walking track is broken senior citizens falling down daily"
        ],
        "typos": [
            "childrn playgroud swing brokn shrap iron cuting kids",
            "crematrium furnas out of ordr pleas fix imedatly",
            "larg dri tre can fal on haus pleas trim branchs",
            "publc pak benchs brokn by vandls no sit for seniors",
            "ward ofis offical not comming for publik complant"
        ]
    }
}


def clean_text(text: str) -> str:
    """Normalizes text, removes surrounding quotes, extra whitespaces."""
    text = text.replace('"', '').replace("'", "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def generate_candidate_complaints() -> Dict[str, List[str]]:
    """
    Generates a large diverse pool of complaints for each department using combinations
    of core issues, locations, severity, consequences, styles, colloquialisms, and typos.
    """
    candidates = defaultdict(list)
    
    # Prefix / Opener variations
    formal_openers = [
        "Kindly note that", "This is to report that", "Urgent attention required:",
        "Requesting immediate action as", "Complaint regarding", "Please resolve issue where",
        "It is brought to municipal notice that", "Serious public grievance:",
        "Citizens facing acute problem because", "Civic issue reported:"
    ]
    urgent_openers = [
        "Urgent! Major emergency:", "Extremely hazardous condition:", "Critical danger:",
        "Immediate intervention needed!", "Very serious hazard:", "Disaster waiting to happen:",
        "Public safety at severe risk:", "Attention Municipal Commissioner:"
    ]
    colloquial_openers = [
        "Sir please look into this,", "Respected sir,", "Hello civic team,",
        "Dear authority,", "Please help,", "Kindly fix this problem,",
        "No action taken so far,", "Complaining for the third time,"
    ]

    for dept, data in DEPARTMENT_KNOWLEDGE.items():
        pool = set()

        # 1. Structural combination of cores + locations + openers
        cores = data["cores"]
        for issue, consequence in cores:
            for _ in range(50):
                loc_pattern = random.choice(LOCATIONS)
                landmark = random.choice(LANDMARKS)
                road = random.choice(ROAD_TYPES)
                building = random.choice(BUILDINGS)
                junction = random.choice(JUNCTIONS)
                colony = random.choice(COLONIES)
                ward = random.randint(1, 198)

                loc_str = loc_pattern.format(
                    landmark=landmark, road_type=road, building=building,
                    junction=junction, colony=colony, ward=ward
                )

                style = random.choice(["standard", "formal", "urgent", "colloquial", "short", "consequence_first"])

                if style == "standard":
                    complaint = f"{issue.capitalize()} {loc_str}, {consequence}."
                elif style == "formal":
                    opener = random.choice(formal_openers)
                    complaint = f"{opener} there is a {issue} {loc_str}. This is {consequence}. Kindly take remedial action."
                elif style == "urgent":
                    opener = random.choice(urgent_openers)
                    complaint = f"{opener} {issue} {loc_str}! It is {consequence}. Immediate action requested."
                elif style == "colloquial":
                    opener = random.choice(colloquial_openers)
                    complaint = f"{opener} {issue} {loc_str}, {consequence}. Please send team as soon as possible."
                elif style == "short":
                    complaint = f"{issue.capitalize()} {loc_str}."
                elif style == "consequence_first":
                    complaint = f"Due to {issue} {loc_str}, it is {consequence}."

                cleaned = clean_text(complaint)
                if len(cleaned) >= 20 and len(cleaned.split()) >= 4:
                    pool.add(cleaned)

        # 2. Add realistic colloquial citizen submissions
        colloquials = data.get("colloquial", [])
        for base in colloquials:
            for _ in range(35):
                loc_pattern = random.choice(LOCATIONS)
                landmark = random.choice(LANDMARKS)
                road = random.choice(ROAD_TYPES)
                building = random.choice(BUILDINGS)
                junction = random.choice(JUNCTIONS)
                colony = random.choice(COLONIES)
                ward = random.randint(1, 198)

                loc_str = loc_pattern.format(
                    landmark=landmark, road_type=road, building=building,
                    junction=junction, colony=colony, ward=ward
                )

                time_frame = random.choice([
                    "since yesterday", "from last 3 days", "for past one week",
                    "since two weeks", "every evening", "since morning",
                    "after last rain", "since past 10 days"
                ])

                variations = [
                    f"{base.capitalize()} {loc_str} {time_frame}.",
                    f"Sir, {base} {loc_str}. Nobody is responding.",
                    f"{base.capitalize()} {loc_str}, please take action immediately.",
                    f"In {colony} Ward {ward}, {base} {time_frame}. Very difficult situation.",
                    f"{loc_str.capitalize()}, {base}. Kindly resolve.",
                    f"{base.capitalize()} {time_frame} {loc_str}. High danger."
                ]
                for v in variations:
                    c = clean_text(v)
                    if len(c) >= 20:
                        pool.add(c)

        # 3. Add realistic imperfect grammar / typo submissions
        typos = data.get("typos", [])
        for base in typos:
            for _ in range(25):
                colony = random.choice(COLONIES)
                ward = random.randint(1, 198)
                road = random.choice(ROAD_TYPES)
                landmark = random.choice(LANDMARKS)

                variations = [
                    f"{base} in {colony} ward {ward}",
                    f"{base} near {landmark} {road}",
                    f"plz help {base} on {road}",
                    f"urgent {base} {colony} near {landmark}",
                    f"{base} ward {ward} since 2 days kindly fix"
                ]
                for v in variations:
                    c = clean_text(v)
                    if len(c) >= 15:
                        pool.add(c)

        # 4. Include existing seed records if valid for semantic guidance
        seed_file = DATASET_DIR / "seed" / "train.csv"
        if seed_file.exists():
            with open(seed_file, mode="r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    parts = line.split('","')
                    if len(parts) == 2:
                        comp = parts[0].replace('"', '').strip()
                        dept_name = parts[1].replace('"', '').strip()
                        if dept_name == dept and len(comp) >= 20:
                            pool.add(clean_text(comp))

        candidates[dept] = list(pool)
        print(f"Generated {len(candidates[dept])} candidate complaints for {dept}")

    return candidates


def filter_and_balance_dataset(candidates: Dict[str, List[str]]) -> Dict[str, List[str]]:
    """
    Applies strict deduplication:
    1. Exact deduplication
    2. Normalized deduplication (lowercase, stripped punctuation, collapsed whitespace)
    3. N-gram / Jaccard token near-duplicate pruning (tokens overlap > 0.82)
    4. Exact class balancing to TARGET_PER_DEPT (1,250 per department)
    """
    print("\n--- Running Strict Quality Filtering & Deduplication ---")
    final_dataset = {}
    global_normalized_seen = set()

    for dept in DEPARTMENTS:
        records = candidates[dept]
        random.shuffle(records)

        unique_dept = []
        token_sets_dept = []

        for text in records:
            # Normalized key
            norm_key = re.sub(r"[^\w\s]", "", text.lower()).strip()
            norm_key = re.sub(r"\s+", " ", norm_key)

            if norm_key in global_normalized_seen:
                continue

            tokens = set(norm_key.split())
            if len(tokens) < 4:
                continue

            # Near-duplicate check with existing in dept (Jaccard similarity threshold 0.82)
            is_near_dup = False
            for prev_tokens in token_sets_dept[-100:]:
                intersection = len(tokens & prev_tokens)
                union = len(tokens | prev_tokens)
                if union > 0 and (intersection / union) > 0.82:
                    is_near_dup = True
                    break

            if is_near_dup:
                continue

            global_normalized_seen.add(norm_key)
            unique_dept.append(text)
            token_sets_dept.append(tokens)

            if len(unique_dept) == TARGET_PER_DEPT:
                break

        if len(unique_dept) < TARGET_PER_DEPT:
            raise ValueError(
                f"Could not reach target of {TARGET_PER_DEPT} for department '{dept}'. "
                f"Only got {len(unique_dept)} unique records. Increase pool generation!"
            )

        final_dataset[dept] = unique_dept[:TARGET_PER_DEPT]
        print(f"[{dept:<20}] Successfully filtered: {len(final_dataset[dept])} unique records")

    return final_dataset


def main():
    print("=" * 70)
    print("   CIVICCONNECT 10,000 CIVIC COMPLAINT DATASET GENERATION")
    print("=" * 70)

    GENERATED_DIR.mkdir(parents=True, exist_ok=True)
    CLEANED_DIR.mkdir(parents=True, exist_ok=True)

    candidates = generate_candidate_complaints()

    # Save raw candidate pool for auditability
    raw_path = GENERATED_DIR / "raw_candidate_pool.csv"
    with open(raw_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["complaint", "department"])
        for dept, texts in candidates.items():
            for t in texts:
                writer.writerow([t, dept])
    print(f"\nRaw candidate pool saved to: {raw_path}")

    # Run filtering & balancing
    cleaned_data = filter_and_balance_dataset(candidates)

    # Combine into master 10,000 list and shuffle
    all_rows = []
    for dept, texts in cleaned_data.items():
        for t in texts:
            all_rows.append({"complaint": t, "department": dept})

    random.shuffle(all_rows)

    if len(all_rows) != TOTAL_TARGET:
        raise ValueError(f"Total rows must be {TOTAL_TARGET}, got {len(all_rows)}")

    # Save master cleaned 10,000 dataset
    master_path = CLEANED_DIR / "cleaned_10000.csv"
    with open(master_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["complaint", "department"])
        for r in all_rows:
            writer.writerow([r["complaint"], r["department"]])

    print(f"\nMaster Cleaned Dataset successfully written: {master_path} ({len(all_rows)} rows)")
    print("=" * 70)


if __name__ == "__main__":
    main()
