const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://mshauraya_db_user:zQky6peK2Ah08fRp@cluster0.xvusx3e.mongodb.net/?appName=Cluster0';

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('mobilify');
  const reports = await db.collection('reports').find({}).sort({createdAt: -1}).toArray();
  console.log('Total reports in DB:', reports.length);

  // Show full structure of first 2 reports (without media data)
  reports.slice(0, 2).forEach((r, i) => {
    const reportCopy = { ...r };
    if (reportCopy.media?.url) {
      reportCopy.media = { ...reportCopy.media, url: reportCopy.media.url.substring(0, 30) + '...' };
    }
    console.log('\n=== Report', i+1, '===');
    console.log(JSON.stringify(reportCopy, null, 2));
  });

  await client.close();
}

main().catch(console.error);
