// app/api/tweets/route.ts
import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY!, appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!, accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

export async function GET() {
  try {
    const me = await client.v2.me();
    const myId = me.data.id;

    const timeline = await client.v2.userTimeline(myId, {
      max_results: 10,
      expansions: ['attachments.media_keys'],
      'tweet.fields': ['public_metrics', 'created_at'],
      'media.fields': ['url', 'preview_image_url'],
    });

    const tweets = timeline.data.data?.map(tweet => {
      const media = timeline.data.includes?.media?.find(
        m => tweet.attachments?.media_keys?.includes(m.media_key!)
      );
      return {
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        metrics: tweet.public_metrics,
        imageUrl: media?.url,
      };
    }) || [];

    return NextResponse.json(tweets);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}