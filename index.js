import telegraf from 'telegraf';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WizardScene from 'telegraf/scenes/wizard/index.js';

// const telegraf = require('telegraf');
// const mongoose = require('mongoose');
// const dotenv = require('dotenv');
// const WizardScene = require('telegraf/scenes/wizard')

// TODO: have some kind of priority or willing status
// TODO: show topbar status while loading

/* - - - - - - - - - - - - - - - - - - - - */

dotenv.config();


/* - - - - - - - - - - - - - - - - - - - - */

const noteSchema = new mongoose.Schema(
  {
    label: String
  }
);

const Note = mongoose.model('note', noteSchema);

const connectionParams={
  useNewUrlParser: true,
  useCreateIndex: true,
  useUnifiedTopology: true
}

mongoose.connect(process.env.DB_URL, connectionParams)
  .then(() => {
    // console.log('Connected to database')
  })
  .catch((err) => {
    console.error(`Error connecting to the database. \n${err}`);
  })


/* - - - - - - - - - - - - - - - - - - - - */





const botWelcomeMessage = `Hey you!`;
const botHelpMessage = `Это еще что... если хочешь отменить действие добавления - просто напиши "Отмена" или "Cancel"`;

const bot = new telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply(botWelcomeMessage));
bot.help((ctx) => ctx.reply(botHelpMessage));

const addMovieWizardID = 'add_movie_wizard';


const { Extra, session, Composer, Stage, Markup, BaseScene } = telegraf;


const addMovieWizard = new WizardScene(
  addMovieWizardID,
  (ctx) => {
    ctx.reply('Название: ');
    return ctx.wizard.next();
  },
  async (ctx) => {
    const { text } = ctx.message;

    if (text === "Отмена" || text === "Cancel") {
      ctx.reply('Принято, отменяю.');
      return ctx.scene.leave();
    }

    if (text.length < 2) {
      ctx.reply('Название слишком короткое, попробуй снова: ');
      return;
    }

    const note = new Note({ label: text });

    await note.save(err => {
      if (err) {
        ctx.reply('К сожалению не удалось сохранить новый фильм.');
        return null;
      }

      ctx.reply(`Позиция "${text}" была добавлена в список.`);
    });

    return ctx.scene.leave();
  },
);

const stage = new Stage([addMovieWizard]);

bot.use(session());
bot.use(stage.middleware());


bot.command('all', ctx => {
  Note.find()
    .then(notes => {
      // TODO: formatted list with appropriate UI

      notes.forEach(({ label }) => {
        ctx.reply(label);
      })
    });
});

bot.command('add', ctx => ctx.scene.enter(addMovieWizardID));


bot.command('delete', (ctx) => {
  Note.find()
    .then(notes => {
      const createButtons = m => notes.map(note => [m.callbackButton(
        note.label,
        JSON.stringify({ a: 'delete', p: note.label }),
        false
      )]);
      const itemKeyboard = Extra.HTML().markup((m) => m.inlineKeyboard(createButtons(m), {}));

      ctx.reply('Delete item: ', itemKeyboard);
    });
});

function exposeMovie(ctx, next) {
  const actionData = JSON.parse(ctx.callbackQuery.data);
  ctx.movie = actionData;

  return next();
}

const deleteAction = async (ctx) => {
  console.log(ctx.movie);
  console.log('-----------');


};

bot.action(/delete/, exposeMovie, deleteAction);

bot.launch()
