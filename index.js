import telegraf from 'telegraf';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WizardScene from 'telegraf/scenes/wizard/index.js';

const { Extra, session, Stage, Markup, BaseScene } = telegraf;

// TODO: formattin text -> red color for delete actions and so on

// TODO: check if suck movie already exist in DB

// TODO: in delete mode - check if record could be deleted only by it's author

// TODO: have some kind of priority or willing status
// TODO: show topbar status while loading

dotenv.config();

/* - - - - - - - - - - - - - - - - - - - - */

export const movieSchema = new mongoose.Schema({
  label: String,
  id: String
});

const Movie = mongoose.model('movie', movieSchema);

const connectionParams={
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true
}

mongoose.connect(process.env.DB_URL, connectionParams)
  .catch((err) => console.error(`Error connecting to the database. \n${err}`))

/* - - - - - - - - - - - - - - - - - - - - */

const botWelcomeMessage = `Hey you!`;
const botHelpMessage = `Commands: /add, /all, /delete`;

const bot = new telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply(botWelcomeMessage));
bot.help((ctx) => ctx.reply(botHelpMessage));

/* - - - - - - - - - Add - - - - - - - - - - - */

export const addMovieWizardID = 'add_movie_wizard';

export const addMovieWizard = new WizardScene(
  addMovieWizardID,
  (ctx) => {
    ctx.reply('Name: ');
    return ctx.wizard.next();
  },
  async (ctx) => {
    const { text } = ctx.message;

    // TODO: add cancel button to keyboard

    // TODO: config file with texts

    if (text === "cancel" || text === "Cancel") {
      ctx.reply('Canceled');
      return ctx.scene.leave();
    }

    if (text.length < 2) {
      ctx.reply('The name is too short: ');
      return;
    }

    const movie = new Movie({ label: text });

    await movie.save(err => {
      if (err) {
        ctx.reply('Could not save the movie record');
        return null;
      }

      ctx.replyWithHTML(`Record <i><b>${text}</b></i> has been saved`);
      // showMovies(ctx);
    });

    return ctx.scene.leave();
  },
);

const stage = new Stage([addMovieWizard]);

bot.use(session());
bot.use(stage.middleware());

bot.command('add', ctx => ctx.scene.enter(addMovieWizardID));

/* - - - - - - - - - Delete - - - - - - - - - - - */

bot.command('delete', async (ctx) => {
  try {
    const movies = await Movie.find();

    const createButtons = m => movies.map(({ _id, label }) => [m.callbackButton(
      label,
      JSON.stringify({ action: 'delete', payload: _id }),
      false
    )]);

    const itemKeyboard = Extra.HTML().markup((m) => m.inlineKeyboard(createButtons(m), {}));
    ctx.reply('Delete item: ', itemKeyboard);
  } catch (err) {
    ctx.reply('Could not make an action');
  }
});

 async function deleteAction (ctx) {
  const { payload: id } = JSON.parse(ctx.callbackQuery.data);

  const { label } = await Movie.findById(id);

  try {
    await Movie.findByIdAndDelete(id);
    ctx.replyWithHTML(`Record <i><b>${label}</b></i> has been removed`);
    // showMovies(ctx);
  } catch {
    ctx.reply('Could not remove record');
  }
};

bot.action(/delete/, deleteAction);

/* - - - - - - - - - - All - - - - - - - - - - */

async function showMovies(ctx) {
  try {
    const movies = await Movie.find();
    ctx.reply('----------')
    return movies.forEach(({ label }) => ctx.reply(label))
  } catch {
    ctx.reply('Could not make an action');
  }
}

bot.command('all', showMovies);

/* - - - - - - - - - - - - - - - - - - - - */


bot.launch()

// ctx.reply("message", { reply_markup: { remove_keyboard: true}});
  