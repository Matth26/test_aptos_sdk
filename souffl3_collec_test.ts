/* eslint-disable no-console */

import dotenv from 'dotenv';
dotenv.config();

import { AptosClient, AptosAccount, TokenClient } from 'aptos';
import { NODE_URL, FAUCET_URL } from './common';
import { exit } from 'process';

interface NFT {
  collection: string;
  name: string;
  uri: string;
}

(async () => {
  // Create API and faucet clients.
  const client = new AptosClient(NODE_URL);
  // Create client for working with the token module.
  const tokenClient = new TokenClient(client);

  const addressToScan =
    '0x81279b8c1419b0b750866ce4be7ecf8556e1e20acccada874f33e23676d15be2';

  // First let's get the deposed events
  const deposit_events = await client.getEventsByEventHandle(
    addressToScan,
    '0x3::token::TokenStore',
    'deposit_events'
  );
  const deposedArray = deposit_events.map((e) => e.data.id.token_data_id);

  // Then the withdraw events
  const withdraw_events = await client.getEventsByEventHandle(
    addressToScan,
    '0x3::token::TokenStore',
    'withdraw_events'
  );
  const withdrewArray = withdraw_events.map((e) => e.data.id.token_data_id);

  // Let's get the NFT deposed but not withdrew
  const nft_owned = deposedArray.filter((deposed) => {
    withdrewArray.every((withdrew) => {
      if (deposed.name === withdrew.name) return false;
    });
    return true;
  });
  //console.log(nft_owned);

  // Now let's fetch the URIs
  const nfts: NFT[] = [];

  const fetchAllUri = new Promise<void>((resolve, reject) => {
    nft_owned.forEach(async (e, index, arr) => {
      /*const collectionData = await tokenClient.getCollectionData(
        e.creator,
        e.collection
      );*/
      //console.log(collectionData);

      const tokenData = await tokenClient.getTokenData(
        e.creator,
        e.collection,
        e.name
      );
      //console.log(tokenData);

      /* Works but it's way easier with getTokenData helper from sdk
      const res = await client.getAccountResource(
        e.creator,
        '0x3::token::Collections'
      );
      const data = res.data as any;
      console.log(data);
      const handle = data.token_data.handle;

      const item = await client.getTableItem(handle, {
        key_type: '0x3::token::TokenDataId',
        value_type: '0x3::token::TokenData',
        key: {
          creator: e.creator,
          collection: e.collection,
          name: e.name,
        },
      });*/

      nfts.push({ collection: e.collection, name: e.name, uri: tokenData.uri });

      if (index === arr.length - 1) resolve();
    });
  });

  await fetchAllUri;
  console.log(nfts);
})();
