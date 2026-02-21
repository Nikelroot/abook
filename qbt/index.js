import { QBittorrentClient } from '../utils/client.js';
import async from 'async';
import Forum from '../models/Forum.js';
import File from '../models/File.js';
import Book from '../models/Book.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const qb = new QBittorrentClient({
  baseUrl: 'http://abook_qbittorrent:9999',
  username: 'Nikelroot',
  password: '&8b3yn%$sxwTl$GWx^^45X#v'
});

async function run(callback) {
  const torrents = await qb.getTorrents({});

  //   console.log('torrents', torrents);

  for (let f of torrents) {
    const { magnet_uri, progress, hash, tags, name } = f;
    console.log('tags', tags.length, tags, typeof tags);
    if (!tags || tags.length !== 24) {
      return;
    }

    let forum = await Forum.updateOne({ _id: tags }, { $set: { progress } }).exec();

    forum = await Forum.findOne({ _id: tags });

    let book = await Book.findOneAndUpdate(
      { forum: forum._id },
      { $set: { name, forum: forum._id } },
      { upsert: true }
    ).exec();
    book = await Book.findOne({ forum: forum._id }).lean();

    const files = await qb.getTorrentFiles(hash);

    for (let file of files) {
      console.log('name', f.name, book._id, file.name);
      const { index, progress, name } = file;
      let ff = await File.findOneAndUpdate(
        { name },
        {
          $set: {
            index: file.index,
            progress: file.progress,
            book: book._id
          }
        },
        { upsert: true }
      ).exec();
      ff = await File.findOne({ name }).lean();

      await Book.updateOne({ _id: book._id }, { $addToSet: { files: ff._id } }).exec();
      await Forum.updateOne(
        { _id: forum._id },
        { $set: { name }, $addToSet: { files: ff._id } }
      ).exec();
      // await delay(10);
    }
    // await delay(100);
  }

  console.log('done');
  callback();
}

async function addTask(callback) {
  const forums = await Forum.find({ hasLink: true, inLibrary: true });

  for (let forum of forums) {
    const resp = await qb.addMagnet(forum.magnet_link, {
      savepath: '/downloads',
      category: '',
      tags: `${forum._id.toString()}`,
      paused: false
    });
  }
  callback();
}

async.forever(
  (next) => {
    run(() => {
      setTimeout(() => {
        next();
      }, 30 * 1000);
    });
  },
  () => {
    process.exit(0);
  }
);
async.forever(
  (next) => {
    addTask(() => {
      setTimeout(() => {
        next();
      }, 30 * 1000);
    });
  },
  () => {
    process.exit(0);
  }
);
