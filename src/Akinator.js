const { regions } = require("./constants/Config");
const { requestAki, setupAki } = require("./functions/Request");
const { AkinatorAnswer } = require("./types/Aki");

class Akinator {
  constructor({ region = "en", childMode = false, config = {} } = {}) {
    if (!regions.includes(region)) {
      throw new Error("Please insert a correct region!");
    }

    this.region = region;
    this.childMode = childMode;
    this.config = config;
    this.step = 0;
    this.progress = 0.0;
    this.question = "";
    this.isWin = false;
    this.sugestion_name = "";
    this.sugestion_desc = "";
    this.sugestion_photo = "";
    this.session = "";
    this.signature = "";
    this.baseUrl = "";
    this.sid = 0;
    this.step_last = undefined;
    this.guesses = [];
    this.forceEnd = false;
  }

  async start() {
    const { session, signature, question, baseUrl, sid } = await setupAki(
      this.region,
      this.childMode,
      this.config
    );

    if (!session || !signature || !question) {
      throw new Error("Failed to get session and signature");
    }

    this.session = session;
    this.signature = signature;
    this.baseUrl = baseUrl || `https://${this.region.split('_')[0]}.akinator.com`; // FIX: Ensure baseUrl exists
    this.sid = sid;
    this.question = question;
    
    console.log(`[Akinator] Started with baseUrl: ${this.baseUrl}`);
  }

  async answer(answ) {
    // Ensure baseUrl is set
    if (!this.baseUrl) {
      const lang = this.region.split('_')[0];
      this.baseUrl = `https://${lang}.akinator.com`;
      console.log(`[Akinator] baseUrl auto-set to: ${this.baseUrl}`);
    }
    
    // Validate URL
    const url = `${this.baseUrl}/answer`;
    console.log(`[Akinator] Calling URL: ${url}`);
    
    const response = await requestAki(
      url,
      {
        step: this.step,
        progression: this.progress,
        sid: this.sid,
        cm: this.childMode,
        answer: answ,
        step_last_proposition: this.step_last || "",
        session: this.session,
        signature: this.signature
      },
      this.config
    );

    if (response.completion !== "OK") {
      console.log(`[Akinator] Response completion: ${response.completion}`);
      throw new Error("Failed making request, completion: " + response.completion);
    }

    // Simpan step_last jika ada
    if (response.step_last_proposition) {
      this.step_last = response.step_last_proposition;
    }

    // Deteksi win condition dari Akinator
    if (response.name_proposition || response.id_proposition) {
      this.isWin = true;
      this.sugestion_name = response.name_proposition || "";
      this.sugestion_desc = response.description_proposition || "";
      this.sugestion_photo = response.photo || "";
      
      // Simpan semua guesses jika ada
      if (response.nb_elements > 0) {
        // Jika response mengandung array propositions
        if (response.propositions && Array.isArray(response.propositions)) {
          response.propositions.forEach(prop => {
            this.guesses.push({
              name: prop.name || prop.name_proposition,
              description: prop.description || prop.description_proposition,
              photo: prop.photo || "",
              id_proposition: prop.id || prop.id_proposition,
              probability: prop.probability || prop.proba || "0%"
            });
          });
        } else {
          // Single guess
          this.guesses.push({
            name: this.sugestion_name,
            description: this.sugestion_desc,
            photo: this.sugestion_photo,
            id_proposition: response.id_proposition,
            probability: response.proba || response.probability || "85%"
          });
        }
      }
      
      console.log(`[Akinator] Found ${this.guesses.length} guess(es)!`);
    } else {
      // Update progress dan question
      this.step = parseInt(response.step) || this.step + 1;
      this.progress = parseFloat(response.progression) || this.progress;
      this.question = response.question || this.question;
      
      console.log(`[Akinator] Step: ${this.step}, Progress: ${this.progress}`);
      
      // Force win detection jika progress sangat tinggi (>95%) tapi belum win
      if (this.progress > 95 && !this.isWin) {
        console.log(`[Akinator] High progress (${this.progress}%) but no win yet.`);
      }
    }
    
    return response;
  }

  async cancelAnswer() {
    // Ensure baseUrl is set
    if (!this.baseUrl) {
      const lang = this.region.split('_')[0];
      this.baseUrl = `https://${lang}.akinator.com`;
    }
    
    const url = `${this.baseUrl}/cancel_answer`;
    console.log(`[Akinator] Canceling at URL: ${url}`);
    
    const response = await requestAki(
      url,
      {
        step: this.step,
        progression: this.progress,
        sid: this.sid,
        cm: this.childMode,
        session: this.session,
        signature: this.signature
      },
      this.config
    );

    this.step = parseInt(response.step);
    this.progress = parseFloat(response.progression);
    this.question = response.question;
    
    console.log(`[Akinator] Canceled to Step: ${this.step}, Progress: ${this.progress}`);
    
    return response;
  }
  
  // Method untuk memaksa berhenti jika diperlukan
  forceStop() {
    this.forceEnd = true;
  }
  
  getAllGuesses() {
    return this.guesses;
  }
  
  async chooseGuess(guessIndex = 0) {
    if (!this.isWin || this.guesses.length === 0) {
      throw new Error("No guesses available");
    }
    
    const guess = this.guesses[guessIndex];
    if (!guess) {
      throw new Error("Invalid guess index");
    }
    
    this.sugestion_name = guess.name;
    this.sugestion_desc = guess.description;
    this.sugestion_photo = guess.photo;
    
    return guess;
  }
}

module.exports = Akinator;