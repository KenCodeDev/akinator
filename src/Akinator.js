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
    this.forceEnd = false; // Flag untuk menghentikan paksa jika diperlukan
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
    this.baseUrl = baseUrl;
    this.sid = sid;
    this.question = question;
  }

  async answer(answ) {
    const response = await requestAki(
      `${this.baseUrl}/answer`,
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
      
      console.log(`🎯 Akinator found ${this.guesses.length} guess(es)!`);
    } else {
      // Update progress dan question
      this.step = parseInt(response.step) || this.step + 1;
      this.progress = parseFloat(response.progression) || this.progress;
      this.question = response.question || this.question;
      
      // Force win detection jika progress sangat tinggi (>95%) tapi belum win
      if (this.progress > 95 && !this.isWin) {
        console.log(`⚠️  High progress (${this.progress}%) but no win yet. Continuing...`);
      }
    }
    
    return response;
  }

  async cancelAnswer() {
    const response = await requestAki(
      `${this.baseUrl}/cancel_answer`,
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