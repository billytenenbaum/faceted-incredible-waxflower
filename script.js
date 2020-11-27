//--------------------------
//Section 1: Basic Functions
//--------------------------

//This function merely helps figure out which option is selected.
function getRadioVal(form, name) {
  var val;
  // get list of radio buttons with specified name
  var radios = document.getElementById(form).elements[name];

  // loop through list of radio buttons
  for (var i = 0, len = radios.length; i < len; i++) {
    if (radios[i].checked) {
      // radio checked?
      val = radios[i].value; // if so, hold its value in val
      break; // and break out of for loop
    }
  }
  return val; // return value of checked radio or undefined if none checked
}

function blendChange(x, delta) {
  return x * (1 - Math.abs(delta)) + delta;
}

//------------------
//Section 2: Classes
//Define classes for encounters, player options, (i.e. verbs,) character reactions, (i.e. more verbs,) and characters.
//------------------

//Define what an encounter consists of:
class Encounter {
  constructor(
    id,
    title,
    main_text,
    prerequisites,
    disqualifiers,
    earliest_turn,
    latest_turn,
    antagonist,
    options
  ) {
    this.id = id; //a string that uniquely identifies this encounter, used for dictionary keys.
    this.title = title; //string
    this.main_text = main_text; //string
    //Prerequisites and disqualifiers consist of the names of encounters, so each array is a list of strings.
    this.prerequisites = prerequisites; //array
    this.disqualifiers = disqualifiers; //array
    this.earliest_turn = earliest_turn; //integer
    this.latest_turn = latest_turn; //integer
    this.antagonist = antagonist; //integer
    this.options = options; //array
  }
}

//Define an option and its associated reactions:
class Player_Option {
  constructor(text, reactions) {
    this.text = text; //string
    this.reactions = reactions; //array
  }
}

class Character_Reaction {
  constructor(
    text,
    blend_x,
    blend_y,
    blend_weight,
    consequence,
    deltaLove,
    deltaTrust,
    deltaFear
  ) {
    this.text = text; //Text to display to player if reaction is chosen.
    this.blend_x = blend_x;
    this.blend_y = blend_y;
    this.blend_weight = blend_weight;
    this.consequence = consequence; //An encounter that must happen next if reaction is chosen.
    this.deltaLove = deltaLove; //Change to pBad_Good.
    this.deltaTrust = deltaTrust; //Change to pFalse_Honest.
    this.deltaFear = deltaFear; //Change to pTimid_Dominant.
  }
}

class Character {
  constructor(
    name,
    pronoun,
    Bad_Good,
    False_Honest,
    Timid_Dominant,
    pBad_Good,
    pFalse_Honest,
    pTimid_Dominant
  ) {
    this.name = name; //The character's name.
    this.pronoun = pronoun; //They, she, he, etc.
    this.Bad_Good = Bad_Good; //How good or bad this character is.
    this.False_Honest = False_Honest; //How dishonest or honest this character is.
    this.Timid_Dominant = Timid_Dominant; //How timid or dominant this character is.
    this.pBad_Good = pBad_Good; //Hate or love for the player character.
    this.pFalse_Honest = pFalse_Honest; //Suspicion of or trust in the player character.
    this.pTimid_Dominant = pTimid_Dominant; //Fear of the player character.
  }
}

//-------------------
//Section 3: Database
//-------------------

//Here is the database of encounters.
var encounters = {};

//The void encounter triggers when no other encounters are acceptable.
var void_reaction = new Character_Reaction(
  "...Just breathe...",
  "pBad_Good",
  "pTimid_Dominant",
  0,
  "wild",
  0,
  0,
  0
);
var void_option = new Player_Option("...Breathe...", [void_reaction]);

var void_encounter = new Encounter(
  "void", //This encounter is displayed if and when no encounters from the database are deemed acceptable.
  //Since this encounter is not contained in the encounters database, it will normally not be chosen or seen.
  "Time Passes", //title
  "The future can wait. You take this moment to breathe.",
  [],
  [],
  0, //earliest turn
  16384, //latest turn
  0, //antagonist
  [void_option]
);

//The splash screen encounter triggers when the page is first loaded.
var splash_reaction = new Character_Reaction(
  "...",
  "pBad_Good",
  "pTimid_Dominant",
  0,
  "wild",
  0,
  0,
  0
);
var splash_option = new Player_Option("Begin", [splash_reaction]);

var splash_encounter = new Encounter(
  "splash", //This encounter is displayed if and when no encounters from the database are deemed acceptable.
  //Since this encounter is not contained in the encounters database, it will normally not be chosen or seen.
  "Welcome", //title
  "~ ~ ~ ~ ~",
  [],
  [],
  0, //earliest turn
  16384, //latest turn
  0, //antagonist
  [splash_option]
);

//We need to keep track of the present encounter.
var current_page = void_encounter;
var next_page = "wild"; //"wild" means a page is chosen semi-randomly, other values specify specific pages.
var current_antagonist = 0;
var turn = 0;

//Here is the database of characters.
var characters = [
  //new Character("Fate", "they", 0, 0, 0, 0, 0, 0)
];

//Here is the history book. Each entry includes an encounter, an option, and a reaction, but the option and reaction entries can equal -1, indicating that none have yet been selected. This database can be exported as a save file.

var slow_historybook = [
  //{"encounter": "start", "option": -1, "reaction": -1}
];

//To enable quick searching of the historybook, here is a dictionary / hash table version. Each key is the name of the encounter, a unique string, while the associated value is the turn when it occured, which also works as an index to the above array if the chosen option and reaction are also needed.

var quick_historybook = {
  //"start": 0
};

//The following string keeps a transcript of play. The player can normally review it at any time.

var playthrough_transcript = "";

function parseReactionsData(data) {
  var each;
  var reactions = [];
  for (each of data) {
    reactions.push(
      new Character_Reaction(
        each[0],
        each[1],
        each[2],
        each[3],
        each[4],
        each[5],
        each[6],
        each[7],
        each[8]
      )
    );
  }
  return reactions;
}

function parseOptionsData(data) {
  var each;
  var options = [];
  for (each of data) {
    options.push(new Player_Option(each[0], parseReactionsData(each[1])));
  }
  return options;
}

//Import game data.
function importGameData() {
  //Characters:
  if (0 == storyworld_data.characters.length) {
    characters.push(new Character("Fate", "they", 0, 0, 0, 0, 0, 0));
    console.log("Warning: Storyworld includes no characters!");
  }
  var each;
  for (each of storyworld_data.characters) {
    characters.push(
      new Character(
        each[0],
        each[1],
        each[2],
        each[3],
        each[4],
        each[5],
        each[6],
        each[7]
      )
    );
  }
  for (each of storyworld_data.encounters) {
    encounters[each[0]] = new Encounter(
      each[0],
      each[1],
      each[2],
      each[3],
      each[4],
      each[5],
      each[6],
      each[7],
      parseOptionsData(each[8])
    );
  }
  if (storyworld_data.hasOwnProperty("void_encounter")) {
    var v_e_data = storyworld_data.void_encounter;
    void_encounter = new Encounter(
      v_e_data[0],
      v_e_data[1],
      v_e_data[2],
      v_e_data[3],
      v_e_data[4],
      v_e_data[5],
      v_e_data[6],
      v_e_data[7],
      parseOptionsData(v_e_data[8])
    );
  }
  if (storyworld_data.hasOwnProperty("splash_encounter")) {
    var s_e_data = storyworld_data.splash_encounter;
    splash_encounter = new Encounter(
      s_e_data[0],
      s_e_data[1],
      s_e_data[2],
      s_e_data[3],
      s_e_data[4],
      s_e_data[5],
      s_e_data[6],
      s_e_data[7],
      parseOptionsData(s_e_data[8])
    );
  }
  if (storyworld_data.hasOwnProperty("first_page")) {
    next_page = storyworld_data.first_page;
  }
}

//-----------------------------
//Section 4: Saving and Loading
//-----------------------------

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  var expires = "expires=" + d.toGMTString();
  document.cookie =
    cname + "=" + cvalue + ";" + expires + ";path=/;SameSite=Lax";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

var save_profile = {};

var save_profile_string = getCookie("save_profile");
if (save_profile_string != "") {
  save_profile = JSON.parse(save_profile_string);
}

function saveGame(save_filename, note = "") {
  save_filename = encodeURIComponent(save_filename);
  var save_dictionary = {};
  save_dictionary.save_filename = save_filename;
  save_dictionary.slow_historybook = slow_historybook;
  save_dictionary.characters = characters;
  save_dictionary.note = encodeURIComponent(note);
  var save_file = JSON.stringify(save_dictionary);
  setCookie("saved_game_" + save_filename, save_file, 4096);
  save_profile[save_filename] = new Date().toUTCString();
  setCookie("save_profile", JSON.stringify(save_profile), 4096);
  displaySaveProfile();
  console.log("Saved game: " + save_filename);
}

function loadGame(save_filename) {
  //Set slow historybook to saved historybook.
  var save_dictionary = JSON.parse(getCookie("saved_game_" + save_filename));
  //console.log("Loading game: " + save_filename + " : " + );
  slow_historybook = save_dictionary.slow_historybook;
  characters = save_dictionary.characters;
  //Fill quick historybook from slow historybook.
  //Fill transcript from slow historybook as well.
  quick_historybook = {};
  playthrough_transcript = "";
  for (const [index, value] of slow_historybook.entries()) {
    quick_historybook[value.encounter] = index;
    if (-1 != value.option && -1 != value.reaction) {
      writeEncounterToTranscript(value.encounter, value.option, value.reaction);
    }
  }
  document.getElementById("transcript").innerHTML = playthrough_transcript;
  refreshCollapsable(document.getElementById("transcript"));
  turn = slow_historybook.length;
  //Load last encounter.
  if ("undefined" === typeof slow_historybook[slow_historybook.length - 1]) {
    loadEncounter(void_encounter, false); //Don't record to historybook.
  } else if (
    "void" == slow_historybook[slow_historybook.length - 1].encounter
  ) {
    loadEncounter(void_encounter, false); //Don't record to historybook.
  } else if (
    "splash" == slow_historybook[slow_historybook.length - 1].encounter
  ) {
    loadEncounter(splash_encounter, false); //Don't record to historybook.
  } else {
    loadEncounter(
      slow_historybook[slow_historybook.length - 1].encounter,
      false
    ); //Don't record to historybook.
  }
  console.log("Loaded saved game: " + save_filename);
}

function deleteSavedGame(save_filename) {
  setCookie("saved_game_" + save_filename, "", 0);
  delete save_profile[save_filename];
  setCookie("save_profile", JSON.stringify(save_profile), 4096);
  displaySaveProfile();
  console.log("Deleted saved game: " + save_filename);
}

function confirmSaveGame(save_filename, note = "") {
  if ("" == getCookie("saved_game_" + save_filename)) {
    //No save file by this name exists.
    saveGame(save_filename, note);
  } else {
    var confirmed = confirm(
      "Do you wish to overwrite this savefile? (" + save_filename + ")"
    );
    if (true == confirmed) {
      saveGame(save_filename, note);
    }
  }
}

function confirmLoadGame(save_filename) {
  var confirmed = confirm(
    "Do you wish to load this saved game? Unsaved progress will be lost."
  );
  if (true == confirmed) {
    loadGame(save_filename);
  }
}

function confirmDeleteSavedGame(save_filename) {
  var confirmed = confirm(
    "Do you wish to delete this saved game? The savefile will be permanently erased."
  );
  if (true == confirmed) {
    deleteSavedGame(save_filename);
  }
}

function displaySaveProfile() {
  var each;
  var text = "<p><b>Saved Games:</b></p>";
  for (each in save_profile) {
    text =
      text +
      "<p>" +
      "<a href=\"javascript:confirmLoadGame('" +
      each +
      "')\">Load</a> / <a href=\"javascript:confirmDeleteSavedGame('" +
      each +
      "')\">Delete</a> " +
      decodeURIComponent(each) +
      " : " +
      save_profile[each] +
      " : " +
      decodeURIComponent(JSON.parse(getCookie("saved_game_" + each)).note) +
      "</p>";
  }
  document.getElementById("saved_game_list").innerHTML = text;
  refreshCollapsable(document.getElementById("main_menu"));
}

//Undo Functionality - Potential Future Addition
//Will need a way to replay game up to destination turn in order to recalculate character relations, or a way to store character relation data for every turn.
/*function undoToTurn(destination){
  turn = destination;
  slow_historybook.splice((destination + 1), (slow_historybook.length - destination - 1));
  quick_historybook = {};
  playthrough_transcript = "";
  for (const [index,value] of slow_historybook.entries()){
    quick_historybook[value.encounter] = index;
    if (-1 != value.option && -1 != value.reaction){
	  writeEncounterToTranscript(value.encounter, value.option, value.reaction);
	}
  }
  document.getElementById("transcript").innerHTML = playthrough_transcript;
  refreshCollapsable(document.getElementById("transcript"));
  //Load last encounter.
  if ('undefined' === typeof slow_historybook[slow_historybook.length - 1]){
    loadEncounter(void_encounter, false);//Don't record to historybook.
  } else if ("void" == slow_historybook[slow_historybook.length - 1].encounter){
    loadEncounter(void_encounter, false);//Don't record to historybook.
  } else if ("splash" == slow_historybook[slow_historybook.length - 1].encounter){
    loadEncounter(splash_encounter, false);//Don't record to historybook.
  } else {
    loadEncounter(slow_historybook[slow_historybook.length - 1].encounter, false);//Don't record to historybook.
  }
  console.log("Loaded saved game: " + save_filename);
}*/

//-----------------------
//Section 5: Main Process
//-----------------------

//Load an encounter:
//This one is mildly complicated. It looks up an encounter in the above database and displays it to the player.
function loadEncounter(encounter, record = true) {
  //This function can either take a string as input, in which case it treats the string as the encounter name and looks up the encounter in the encounters database, or it can take an encounter as input, thereby skipping the database lookup.
  if (typeof encounter == "string") {
    encounter = encounters[encounter];
  }
  console.log(
    "Turn: " +
      turn +
      ' Displaying encounter: "' +
      encounter.title +
      '" Antagonist: ' +
      characters[encounter.antagonist].name
  );
  current_page = encounter; //Track which encounter we're in.
  next_page = "start"; //Set the next encounter to be semi-random.
  current_antagonist = encounter.antagonist; //integer

  //Now we change the main encounter text to what it needs to be.
  document.getElementById("encounter_text").innerHTML =
    "<b>(" + encounter.title + ")</b><br><br>" + encounter.main_text;

  //Now we go through the options one by one, creating links for each.
  var each;
  var entry;
  var compiled_options = "";
  var index = 0;
  for (each of encounter.options) {
    //This produces HTML code from a list of options.
    entry = '&gt; <a href="javascript:executeOption(';
    entry = entry + index.toString();
    entry = entry + ')">';
    entry = entry + each.text;
    entry = entry + "</a><br>";
    compiled_options = compiled_options + entry;
    index++;
  }
  document.getElementById("options_list").innerHTML = compiled_options;

  //If there are no options for this encounter, hide the options field.
  if (0 == encounter.options.length) {
    document.getElementById("options_text").style.display = "none";
  } else {
    document.getElementById("options_text").style.display = "block";
  }

  //Render the reaction field invisible.
  document.getElementById("reaction_field").style.display = "none";
  document.getElementById("reaction_text").innerHTML = "";

  if (record) {
    //if we're recording to the historybook and transcript:
    //Update the transcript.
    document.getElementById("transcript").innerHTML = playthrough_transcript;
    refreshCollapsable(document.getElementById("transcript"));

    //Update the historybook.
    slow_historybook[turn] = {
      encounter: current_page.id,
      option: -1,
      reaction: -1
    };
    quick_historybook[current_page.id] = turn;
    //Most encounters can only be displayed once. However, the void encounter can be displayed multiple times, (whenever no other encounters are acceptable for display,) and the "consequence" property of character reactions bypasses the check of whether an encounter has already been displayed. In these cases the quick_historybook will only record the latest turn the encounter was displayed. Since the quick_historybook is primarilly used to check for prerequisites and disqualifiers, and to avoid displaying encounters more than once, the information needed is whether an encounter has occured; when it occured is presently less important. If future changes to the overall design eventually require it, entries to the quick_historybook can be changed to arrays of integers, rather than integers, to record all turns an encounter is displayed.
  }

  //If all goes well... It's the player's turn!
}

function executeOption(which) {
  var reactions = current_page.options[parseInt(which)].reactions;
  var topInclination = -1; //Reset variable to lowest possible value, -1.
  var workingChoice = 0; //Which reaction will the character choose? Reset variable.
  var antagonistLove = characters[current_antagonist].pBad_Good;
  var antagonistTrust = characters[current_antagonist].pFalse_Honest;
  var antagonistFear = characters[current_antagonist].pTimid_Dominant;
  var index = 0;
  var each;
  for (each of reactions) {
    //This chooses how a character reacts to the player's choice.
    var weight = (each.blend_weight + 1) / 2;
    var blend_x = each.blend_x;
    var blend_x_sign = 1;
    if ("-" == blend_x.charAt(0)) {
      blend_x = blend_x.substr(1);
      blend_x_sign = -1;
    }
    var blend_x_value = blend_x_sign * characters[current_antagonist][blend_x];
    var blend_y = each.blend_y;
    var blend_y_sign = 1;
    if ("-" == blend_y.charAt(0)) {
      blend_y = blend_y.substr(1);
      blend_y_sign = -1;
    }
    var blend_y_value = blend_y_sign * characters[current_antagonist][blend_y];
    var latestInclination =
      blend_x_value * (1 - weight) + blend_y_value * weight;
    if (latestInclination >= topInclination) {
      topInclination = latestInclination;
      workingChoice = index;
    }
    index++;
    console.log(
      'Reaction: "' +
        each.text.substr(0, 9) +
        '..." Inclination: ' +
        latestInclination.toString() +
        " Blended " +
        each.blend_x +
        " (" +
        blend_x_value +
        ") and " +
        each.blend_y +
        " (" +
        blend_y_value +
        ") with weight " +
        each.blend_weight +
        "."
    );
  }
  //Execute reaction:
  //If a consequence encounter is defined, ensure that occurs next:
  next_page = reactions[workingChoice].consequence;
  //Make appropriate changes to character relations:
  characters[current_antagonist].pBad_Good = blendChange(
    antagonistLove,
    reactions[workingChoice].deltaLove
  );
  characters[current_antagonist].pFalse_Honest = blendChange(
    antagonistTrust,
    reactions[workingChoice].deltaTrust
  );
  characters[current_antagonist].pTimid_Dominant = blendChange(
    antagonistFear,
    reactions[workingChoice].deltaFear
  );
  //Change text of options list to show only the text of the option chosen by the player.
  document.getElementById("options_list").innerHTML =
    "&gt; " + current_page.options[parseInt(which)].text;
  //Display text of chosen reaction.
  document.getElementById("reaction_field").style.display = "block";
  document.getElementById("reaction_text").innerHTML =
    reactions[workingChoice].text;
  if (current_page != "splash") {
    //Unless we're just starting a new game.
    //We already wrote the present encounter to the quick_historybook when we displayed the encounter. We also wrote it to the slow_historybook, but left the player and character choices "blank," (i.e. at -1.) Now we record the player and character choices in the slow_historybook.
    slow_historybook[turn] = {
      encounter: current_page.id,
      option: which,
      reaction: workingChoice
    };
  }
}

//Update transcript with text of the present encounter, option, and reaction.
function writeToTranscript() {
  playthrough_transcript =
    playthrough_transcript +
    "<p><b>~~~~~</b></p>" +
    document.getElementById("encounter_text").innerHTML +
    "<p>" +
    document.getElementById("options_list").innerHTML +
    "</p><p>" +
    document.getElementById("reaction_text").innerHTML +
    "</p>";
}

function writeEncounterToTranscript(encounter_name, option, reaction) {
  var encounter;
  if ("void" == encounter_name) {
    encounter = void_encounter;
  } else if ("splash" == encounter_name) {
    //Should never occur, as splash screen is not recorded to historybook.
    encounter = splash_encounter;
  } else {
    encounter = encounters[encounter_name];
  }
  if (
    "undefined" == typeof encounter.options[option] ||
    "undefined" == typeof encounter.options[option].reactions[reaction]
  ) {
    //Test for corrupted savefile, or other errors.
    playthrough_transcript =
      playthrough_transcript +
      "<p><b>~~~~~</b></p>" +
      "<b>(" +
      encounter.title +
      ")</b><br><br>" +
      encounter.main_text +
      "<p>" +
      "&gt; " +
      "Option and/or reaction undefined." +
      "</p>";
  } else {
    playthrough_transcript =
      playthrough_transcript +
      "<p><b>~~~~~</b></p>" +
      "<b>(" +
      encounter.title +
      ")</b><br><br>" +
      encounter.main_text +
      "<p>" +
      "&gt; " +
      encounter.options[option].text +
      "</p><p>" +
      encounter.options[option].reactions[reaction].text +
      "</p>";
  }
}

//Select which encounter comes next:
function selectEncounter() {
  console.log("Selecting next encounter.");
  if (0 != turn) {
    //Unless we're just starting a new game.
    writeToTranscript(); //Record the last encounter to the transcript before moving on.
  }
  turn = turn + 1;
  if ("wild" != next_page) {
    //If the reaction of the last encounter led to a consequence, that consequence occurs next.
    loadEncounter(next_page);
  } else {
    //Otherwise:
    var each;
    var encounter;
    var acceptable_encounters = [];
    for (each in encounters) {
      encounter = encounters[each];
      //Check whether an encounter is acceptable.
      var acceptable = false;
      //If turn is within range, and encounter has not occured before,
      console.log(
        "Checking acceptability of: " +
          encounter.title +
          " | " +
          encounter.earliest_turn.toString() +
          " <= " +
          turn.toString() +
          " <= " +
          encounter.latest_turn.toString()
      );
      if (
        encounter.earliest_turn <= turn &&
        turn <= encounter.latest_turn &&
        !quick_historybook.hasOwnProperty(encounter.id)
      ) {
        acceptable = true;
        //and all prerequisites are in the historybook,
        var x;
        for (x of encounter.prerequisites) {
          if (!quick_historybook.hasOwnProperty(x)) {
            //if a prerequisite is not contained in the historybook:
            acceptable = false;
          }
        }
        //and no disqualifiers are in the historybook,
        for (x of encounter.disqualifiers) {
          if (quick_historybook.hasOwnProperty(x)) {
            //if a disqualifier is contained in the historybook:
            acceptable = false;
          }
        }
      }
      if (acceptable) {
        console.log("Encounter: " + encounter.title + " deemed acceptable.");
        acceptable_encounters.push(encounter.id);
      }
    } //end of for (each in encounters)
    //If no encounters are deemed acceptable, display the "void" encounter.
    if (0 == acceptable_encounters.length) {
      loadEncounter(void_encounter);
    } else {
      //Choose a random encounter from the pool of acceptable encounters.
      next_page =
        acceptable_encounters[
          Math.floor(Math.random() * acceptable_encounters.length)
        ];
      //Add the chosen encounter to the historybook, then display it.
      loadEncounter(next_page);
    }
  }
}

//Start a new game / playthrough.
function startNewGame(ask_for_confirmation = true) {
  var confirmed = true;
  if (ask_for_confirmation) {
    confirmed = confirm(
      "Do you wish to start a new game? Unsaved progress will be lost."
    );
  }
  if (true == confirmed) {
    slow_historybook = [];
    quick_historybook = {};
    playthrough_transcript = "";
    turn = 0;
    current_page = void_encounter;
    next_page = "wild";
    current_antagonist = 0;
    displaySaveProfile();
    importGameData(); //Reset Character relations.
    selectEncounter();
  }
}

function refreshCollapsable(element) {
  if (element.style.maxHeight) {
    element.style.maxHeight = element.scrollHeight + "px";
  }
}
