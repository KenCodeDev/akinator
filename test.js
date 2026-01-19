const { Akinator, AkinatorAnswer } = require('./src/index.js');
const readline = require('readline');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function untuk question dengan promise
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

class UnlimitedAkinatorGame {
  constructor(region = 'id', childMode = false) {
    this.aki = new Akinator({ region, childMode });
    this.gameActive = true;
    this.totalQuestions = 0;
  }
  
  async start() {
    console.log('🎮 AKINATOR UNLIMITED GAME 🎮');
    console.log('='.repeat(40));
    console.log('Game akan berjalan sampai Akinator bisa menebak karakter!');
    console.log('Tidak ada batasan jumlah pertanyaan.\n');
    
    try {
      console.log('Memulai sesi Akinator...');
      await this.aki.start();
      
      // Main game loop
      while (this.gameActive && !this.aki.isWin) {
        await this.askNextQuestion();
      }
      
      // Show results
      await this.showResults();
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
    } finally {
      rl.close();
    }
  }
  
  async askNextQuestion() {
    this.totalQuestions++;
    
    console.log(`\n📊 [Pertanyaan ${this.totalQuestions}]`);
    console.log(`📈 Progress: ${this.aki.progress.toFixed(2)}%`);
    console.log(`🔢 Step: ${this.aki.step}`);
    console.log(`\n❓ ${this.aki.question}\n`);
    
    console.log('Pilihan jawaban:');
    console.log('  0 - Ya');
    console.log('  1 - Tidak');
    console.log('  2 - Tidak tahu');
    console.log('  3 - Mungkin');
    console.log('  4 - Mungkin tidak');
    console.log('  5 - Batalkan jawaban sebelumnya');
    console.log('  6 - Keluar dari game');
    
    const answer = await askQuestion('\nPilih jawaban (0-6): ');
    
    switch(answer) {
      case '0':
        await this.aki.answer(AkinatorAnswer.Yes);
        break;
      case '1':
        await this.aki.answer(AkinatorAnswer.No);
        break;
      case '2':
        await this.aki.answer(AkinatorAnswer["Don't know"]);
        break;
      case '3':
        await this.aki.answer(AkinatorAnswer.Probably);
        break;
      case '4':
        await this.aki.answer(AkinatorAnswer.ProbablyNot);
        break;
      case '5':
        await this.cancelLastAnswer();
        break;
      case '6':
        this.gameActive = false;
        console.log('\n👋 Keluar dari game...');
        break;
      default:
        console.log('⚠️  Pilihan tidak valid, coba lagi.');
        this.totalQuestions--; // Tidak hitung sebagai pertanyaan
    }
    
    // Check jika Akinator sudah menang
    if (this.aki.isWin) {
      console.log('\n🎉 AKINATOR SUDAH SIAP MENEBAK! 🎉');
    }
    
    // Delay kecil untuk menghindari rate limit
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  async cancelLastAnswer() {
    if (this.aki.step > 0) {
      console.log('Membatalkan jawaban terakhir...');
      await this.aki.cancelAnswer();
      this.totalQuestions = Math.max(0, this.totalQuestions - 2); // Kurangi 2 (pertanyaan + cancel)
      console.log('Kembali ke pertanyaan sebelumnya.');
    } else {
      console.log('⚠️  Tidak ada jawaban untuk dibatalkan.');
    }
  }
  
  async showResults() {
    console.log('\n' + '='.repeat(50));
    console.log('🎮 HASIL PERMAINAN 🎮');
    console.log('='.repeat(50));
    
    if (this.aki.isWin) {
      console.log('\n✨ AKINATOR BERHASIL MENEBAK KARAKTER! ✨');
      console.log(`📊 Total Pertanyaan: ${this.totalQuestions}`);
      console.log(`🏆 Final Progress: ${this.aki.progress.toFixed(2)}%`);
      console.log(`🔢 Final Step: ${this.aki.step}`);
      
      const allGuesses = this.aki.getAllGuesses();
      
      if (allGuesses.length > 0) {
        console.log('\n🔍 TEBAKAN AKINATOR:');
        console.log('='.repeat(40));
        
        allGuesses.forEach((guess, index) => {
          console.log(`\n${index + 1}. ${guess.name}`);
          console.log(`   📖: ${guess.description}`);
          if (guess.photo) {
            console.log(`   🖼️ : ${guess.photo}`);
          }
          if (guess.probability) {
            console.log(`   📊 Probability: ${guess.probability}`);
          }
        });
        
        // Tanyakan apakah tebakan benar
        const isCorrect = await askQuestion('\nApakah tebakan Akinator benar? (y/n): ');
        
        if (isCorrect.toLowerCase() === 'y') {
          console.log('\n✅ SELAMAT! AKINATOR BERHASIL MENEBAK DENGAN TEPAT!');
        } else {
          console.log('\n😞 Sayang sekali, Akinator belum berhasil.');
          console.log('Coba pikirkan karakter yang lebih mudah atau jawab lebih konsisten!');
        }
      }
    } else {
      console.log('\n⏹️  PERMAINAN DIHENTIKAN');
      console.log(`📊 Total Pertanyaan: ${this.totalQuestions}`);
      console.log(`📈 Progress Terakhir: ${this.aki.progress.toFixed(2)}%`);
      console.log(`🔢 Step Terakhir: ${this.aki.step}`);
      console.log('\n💡 Tips: Jawablah dengan lebih konsisten untuk membantu Akinator!');
    }
  }
}

// Auto-play version (tanpa input manual)
class AutoUnlimitedAkinator {
  constructor(region = 'id', childMode = false) {
    this.aki = new Akinator({ region, childMode });
    this.totalQuestions = 0;
    this.answerStrategy = this.createStrategy();
  }
  
  createStrategy() {
    // Strategy untuk menjawab secara "pintar"
    return {
      earlyGame: [AkinatorAnswer.Yes, AkinatorAnswer.Probably], // Lebih positif di awal
      midGame: [AkinatorAnswer.Yes, AkinatorAnswer.No, AkinatorAnswer.Probably],
      lateGame: [AkinatorAnswer.Yes, AkinatorAnswer.No] // Lebih spesifik di akhir
    };
  }
  
  async start() {
    console.log('🤖 AKINATOR AUTO-PLAY MODE');
    console.log('='.repeat(40));
    console.log('Game akan berjalan otomatis sampai Akinator menang!\n');
    
    try {
      console.log('Memulai sesi Akinator...');
      await this.aki.start();
      
      let consecutiveSameProgress = 0;
      let lastProgress = 0;
      
      // Unlimited loop sampai win
      while (!this.aki.isWin) {
        this.totalQuestions++;
        
        // Tampilkan info setiap 5 pertanyaan atau progress naik signifikan
        if (this.totalQuestions % 5 === 0 || this.aki.progress - lastProgress > 5) {
          console.log(`\n📊 [Q${this.totalQuestions}] Progress: ${this.aki.progress.toFixed(2)}% | Step: ${this.aki.step}`);
          console.log(`❓: ${this.aki.question}`);
        }
        
        // Pilih jawaban berdasarkan strategy
        let answer;
        if (this.aki.progress < 30) {
          answer = this.answerStrategy.earlyGame[
            Math.floor(Math.random() * this.answerStrategy.earlyGame.length)
          ];
        } else if (this.aki.progress < 70) {
          answer = this.answerStrategy.midGame[
            Math.floor(Math.random() * this.answerStrategy.midGame.length)
          ];
        } else {
          answer = this.answerStrategy.lateGame[
            Math.floor(Math.random() * this.answerStrategy.lateGame.length)
          ];
        }
        
        // Jawab pertanyaan
        await this.aki.answer(answer);
        
        // Deteksi stuck progress
        if (Math.abs(this.aki.progress - lastProgress) < 0.5) {
          consecutiveSameProgress++;
        } else {
          consecutiveSameProgress = 0;
          lastProgress = this.aki.progress;
        }
        
        // Jika stuck terlalu lama, coba variasi jawaban
        if (consecutiveSameProgress > 10) {
          console.log(`⚠️  Stuck detected! Trying different answers...`);
          // Coba jawab "Don't know" untuk reset
          await this.aki.answer(AkinatorAnswer["Don't know"]);
          consecutiveSameProgress = 0;
        }
        
        // Delay untuk menghindari rate limit
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Safety check: jika sudah terlalu banyak pertanyaan
        if (this.totalQuestions > 100) {
          console.log('\n⚠️  Safety limit: 100 pertanyaan tercapai.');
          console.log('Mencoba force win detection...');
          
          // Coba answer random beberapa kali untuk trigger win
          for (let i = 0; i < 5 && !this.aki.isWin; i++) {
            const forceAnswers = [AkinatorAnswer.Yes, AkinatorAnswer.No, AkinatorAnswer["Don't know"]];
            const forceAnswer = forceAnswers[Math.floor(Math.random() * forceAnswers.length)];
            await this.aki.answer(forceAnswer);
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          if (!this.aki.isWin) {
            console.log('❌ Tidak bisa mencapai win condition.');
            break;
          }
        }
      }
      
      // Tampilkan hasil
      await this.showResults();
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
    }
  }
  
  async showResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🎮 AUTO-PLAY RESULTS 🎮');
    console.log('='.repeat(60));
    
    if (this.aki.isWin) {
      console.log(`\n✨ AKINATOR MENANG dalam ${this.totalQuestions} pertanyaan!`);
      console.log(`🏆 Final Progress: ${this.aki.progress.toFixed(2)}%`);
      console.log(`🔢 Final Step: ${this.aki.step}`);
      
      const guesses = this.aki.getAllGuesses();
      if (guesses.length > 0) {
        console.log('\n🔍 TOP GUESSES:');
        guesses.forEach((guess, index) => {
          console.log(`\n${index + 1}. ${guess.name}`);
          console.log(`   📖 ${guess.description}`);
          if (guess.probability) {
            console.log(`   📊 ${guess.probability}`);
          }
        });
      }
    } else {
      console.log(`\n⏹️  GAME BERAKHIR TANPA KEMENANGAN`);
      console.log(`📊 Total Pertanyaan: ${this.totalQuestions}`);
      console.log(`📈 Final Progress: ${this.aki.progress.toFixed(2)}%`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Pilih mode game
async function main() {
  console.log('Pilih mode:');
  console.log('1. Manual Play (Input jawaban manual)');
  console.log('2. Auto Play (Bot otomatis)');
  console.log('3. Test All Regions');
  
  const choice = await askQuestion('\nPilihan (1-3): ');
  
  switch(choice) {
    case '1':
      const regionManual = await askQuestion('Region (default: id): ') || 'id';
      const childModeManual = (await askQuestion('Child mode? (y/n): ')).toLowerCase() === 'y';
      const game = new UnlimitedAkinatorGame(regionManual, childModeManual);
      await game.start();
      break;
      
    case '2':
      const regionAuto = await askQuestion('Region (default: id): ') || 'id';
      const childModeAuto = (await askQuestion('Child mode? (y/n): ')).toLowerCase() === 'y';
      const autoGame = new AutoUnlimitedAkinator(regionAuto, childModeAuto);
      await autoGame.start();
      break;
      
    case '3':
      await testAllRegions();
      break;
      
    default:
      console.log('Pilihan tidak valid.');
      rl.close();
  }
}

async function testAllRegions() {
  const testRegions = ['en', 'id', 'jp', 'es', 'fr'];
  
  for (const region of testRegions) {
    console.log(`\n\n🔤 TESTING REGION: ${region.toUpperCase()}`);
    console.log('='.repeat(40));
    
    const autoGame = new AutoUnlimitedAkinator(region, false);
    await autoGame.start();
    
    // Delay antar region
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}

// Jalankan game
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UnlimitedAkinatorGame, AutoUnlimitedAkinator };