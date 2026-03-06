import { QBittorrentClient } from '../utils/client.js';
import Forum from '../models/Forum.js';
import File from '../models/File.js';
import Book from '../models/Book.js';
import qbtLogger from './qbtLogger.js';

process.on('unhandledRejection', (reason) => {
  qbtLogger.error(`unhandled rejection: ${reason?.stack || reason?.message || reason}`);
});

process.on('uncaughtException', (error) => {
  qbtLogger.error(`uncaught exception: ${error?.stack || error?.message || error}`);
  process.exit(1);
});

const LOOP_DELAY_MS = 30 * 1000;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const qb = new QBittorrentClient({
  baseUrl: 'http://abook_qbittorrent:9999',
  username: 'Nikelroot',
  password: '&8b3yn%$sxwTl$GWx^^45X#v'
});

async function syncTorrents() {
  const torrents = await qb.getTorrents({});

  for (const torrent of torrents) {
    const { progress, hash, tags, name: torrentName } = torrent;
    qbtLogger.debug(`torrent name="${torrentName}" tags="${tags}" progress=${progress}`);

    if (!tags || tags.length !== 24) {
      continue;
    }

    const forum = await Forum.findOneAndUpdate({ _id: tags }, { $set: { progress } }, { new: true }).lean();

    if (!forum?._id) {
      qbtLogger.warn(`forum not found for torrent tag="${tags}" name="${torrentName}"`);
      continue;
    }

    const book = await Book.findOneAndUpdate(
      { forum: forum._id },
      { $set: { name: torrentName, forum: forum._id } },
      { upsert: true, new: true }
    ).lean();

    if (!book?._id) {
      qbtLogger.warn(`book upsert failed for forumId=${forum._id.toString()} torrent="${torrentName}"`);
      continue;
    }

    const files = await qb.getTorrentFiles(hash);

    for (const torrentFile of files) {
      const { index: fileIndex, progress: fileProgress, name: fileName } = torrentFile;

      qbtLogger.info(
        `sync file torrent="${torrentName}" bookId=${book._id.toString()} index=${fileIndex} file="${fileName}"`
      );

      const dbFile = await File.findOneAndUpdate(
        { book: book._id, index: fileIndex },
        {
          $set: {
            name: fileName,
            index: fileIndex,
            progress: fileProgress,
            book: book._id
          }
        },
        { upsert: true, new: true }
      ).lean();

      if (!dbFile?._id) {
        qbtLogger.warn(
          `file upsert failed for bookId=${book._id.toString()} index=${fileIndex} file="${fileName}"`
        );
        continue;
      }

      await Book.updateOne({ _id: book._id }, { $addToSet: { files: dbFile._id } }).exec();
      await Forum.updateOne({ _id: forum._id }, { $addToSet: { files: dbFile._id } }).exec();
    }
  }

  qbtLogger.info('torrent sync iteration done');
}

async function addQueuedMagnets() {
  const forums = await Forum.find({ hasLink: true, inLibrary: true }).lean();

  for (const forum of forums) {
    if (!forum?._id || !forum?.magnet_link) {
      continue;
    }

    const resp = await qb.addMagnet(forum.magnet_link, {
      savepath: '/downloads',
      category: '',
      tags: forum._id.toString(),
      paused: false
    });

    qbtLogger.info(`queued magnet forumId=${forum._id.toString()} response=${JSON.stringify(resp)}`);
  }
}

async function startLoop(name, task) {
  while (true) {
    try {
      await task();
    } catch (error) {
      qbtLogger.error(`${name} iteration failed: ${error?.stack || error?.message || error}`);
    }

    await delay(LOOP_DELAY_MS);
  }
}

await Promise.all([startLoop('sync', syncTorrents), startLoop('addTask', addQueuedMagnets)]);
