import React, { useEffect, useMemo, useState } from 'react';
import Loading from '~components/layout/Loading';
import {
  useTokenBalances,
  useWhitelistStableTokens,
  useWhitelistTokens,
} from '../../state/token';
import SquareRadio from '~components/radio/SquareRadio';
import StableSwap from '~components/stableswap/StableSwap';
import AddLiquidityComponent from '~components/stableswap/AddLiquidity';
import { usePool, useStablePool } from '~state/pool';
import { isMobile } from '~utils/device';
import { RemoveLiquidityComponent } from '~components/stableswap/RemoveLiquidity';
import TokenReserves, {
  calculateTotalStableCoins,
} from '~components/stableswap/TokenReserves';
import { FaAngleUp, FaAngleDown, FaExchangeAlt } from 'react-icons/fa';
import getConfig from '~services/config';
import { StableSwapLogo } from '~components/icon/StableSwap';
import { useWalletTokenBalances } from '../../state/token';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { Pool, getStablePoolFromCache, canFarm } from '../../services/pool';
import { Card } from '../../components/card/Card';
import {
  TokenMetadata,
  ftGetTokensMetadata,
  ftGetTokenMetadata,
} from '../../services/ft-contract';
import { toRealSymbol } from '../../utils/token';
import {
  STABLE_POOL_USN_ID,
  STABLE_POOL_ID,
  STABLE_TOKEN_IDS,
  STABLE_TOKEN_USN_IDS,
} from '../../services/near';
import { useFarmStake, useCanFarm } from '../../state/farm';
import BigNumber from 'bignumber.js';
import {
  divide,
  toReadableNumber,
  percentOf,
  percent,
} from '../../utils/numbers';
import { ShareInFarm } from '../../components/layout/ShareInFarm';
import { STABLE_LP_TOKEN_DECIMALS } from '../../components/stableswap/AddLiquidity';
import {
  toInternationalCurrencySystem,
  toPrecision,
  scientificNotationToString,
} from '../../utils/numbers';
import { ConnectToNearBtn, SolidButton } from '~components/button/Button';
import { OutlineButton } from '../../components/button/Button';
import { Images, Symbols } from '~components/stableswap/CommonComp';
import { FarmMiningIcon } from '~components/icon';
import { getCurrentWallet } from '../../utils/sender-wallet';

const RenderDisplayTokensAmounts = ({
  tokens,
  coinsAmounts,
}: {
  tokens: TokenMetadata[];
  coinsAmounts: { [id: string]: BigNumber };
}) => {
  return (
    <div className="flex items-center">
      {tokens.map((token, i) => {
        return (
          <span className="flex" key={token.id}>
            {i ? <span className="mx-3 text-white">+</span> : null}
            <span className="flex items-center">
              <span className="mr-1.5">
                <img
                  src={token.icon}
                  alt=""
                  className="w-4 h-4 boder border-gradientFrom rounded-full"
                />
              </span>

              <span
                className="text-white text-sm"
                title={toPrecision(
                  scientificNotationToString(coinsAmounts[token.id].toString()),
                  2
                )}
              >
                {toInternationalCurrencySystem(
                  scientificNotationToString(coinsAmounts[token.id].toString())
                )}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
};

function formatePoolData({
  pool,
  userTotalShare,
  farmStake,
  tokens,
  share,
  stakeList,
  farmCount,
}: {
  pool: Pool;
  userTotalShare: BigNumber;
  farmStake: string | number;
  tokens: TokenMetadata[];
  share: string;
  stakeList: Record<string, string>;
  farmCount: Number;
}) {
  const isSignedIn = getCurrentWallet().wallet.isSignedIn();

  const tokensMap: {
    [id: string]: TokenMetadata;
  } = tokens.reduce((pre, cur) => ({ ...pre, [cur.id]: cur }), {});

  const { totalCoins, coinsAmounts } = calculateTotalStableCoins(
    [pool],
    tokensMap
  );

  const parsedUsertotalShare = scientificNotationToString(
    userTotalShare.toString()
  );

  const displayTVL = `$${toInternationalCurrencySystem(totalCoins, 2)}`;

  const TVLtitle = `${toPrecision(totalCoins, 2)}`;

  const displayMyShareAmount = isSignedIn
    ? toPrecision(
        toReadableNumber(STABLE_LP_TOKEN_DECIMALS, parsedUsertotalShare),
        2,
        true
      )
    : '-';

  const sharePercentValue = scientificNotationToString(
    percent(parsedUsertotalShare, pool.shareSupply).toString()
  );

  const sharePercent =
    Number(sharePercentValue) > 0 && Number(sharePercentValue) < 0.01
      ? '< 0.01%'
      : `${toPrecision(sharePercentValue, 2)}%`;

  const displaySharePercent = isSignedIn ? sharePercent : '';

  const displayShareInFarm = farmCount ? (
    <ShareInFarm
      farmStake={farmStake}
      userTotalShare={userTotalShare}
      forStable
    />
  ) : (
    ''
  );

  return {
    displayTVL,
    coinsAmounts,
    displayMyShareAmount,
    displaySharePercent,
    displayShareInFarm,
    shares: share,
    stakeList,
    farmStake,
    TVLtitle,
    farmCount,
  };
}

function StablePoolCard({
  stablePool,
  tokens,
  poolData,
}: {
  stablePool: Pool;
  tokens: TokenMetadata[];
  poolData: {
    displayTVL: string | JSX.Element;
    coinsAmounts: { [id: string]: BigNumber };
    displayMyShareAmount: string | JSX.Element;
    displaySharePercent: string | JSX.Element;
    displayShareInFarm: string | JSX.Element;
    shares: string;
    stakeList: Record<string, string>;
    farmStake: string | number;
    TVLtitle: string;
    farmCount: Number;
  };
}) {
  const { shares, stakeList, farmStake } = poolData;
  const history = useHistory();

  const isSignedIn = getCurrentWallet().wallet.isSignedIn();

  const haveFarm = poolData.farmCount > 0;
  const multiMining = poolData.farmCount > 1;
  // const multiMining = false;

  return (
    <div className="w-full flex flex-col relative overflow-hidden rounded-2xl">
      <Card
        width="w-full"
        padding="px-6 pt-8 pb-4"
        rounded="rounded-t-2xl"
        className="flex flex-col"
      >
        <span
          className={`${
            !haveFarm ? 'hidden' : ''
          } pl-3 absolute -right-5 -top-8 pr-8 pt-8   rounded-2xl text-black text-xs bg-gradientFrom `}
        >
          <Link to="/farms" target={'_blank'} className="flex items-center">
            <span className="relative top-px">
              <FormattedMessage
                id={multiMining ? 'multi_rewards' : 'farms'}
                defaultMessage={multiMining ? 'Multi-Rewards' : 'Farms'}
              />
            </span>
            <span className={!multiMining ? 'hidden' : 'relative top-px'}>
              <FarmMiningIcon color="black" w="20" h="20" />
            </span>
          </Link>
        </span>

        <div className="flex items-center justify-between pb-6">
          <Images tokens={tokens} />
          <Link
            to={{
              pathname: `/sauce/${stablePool.id}`,
              state: {
                shares,
                stakeList,
                farmStake,
                pool: stablePool,
              },
            }}
          >
            <Symbols withArrow tokens={tokens} />
          </Link>
        </div>

        <div className="grid grid-cols-10 xs:flex xs:flex-col">
          <div className="col-span-7 text-left">
            <span className="flex flex-col xs:flex-row xs:justify-between">
              <span className="text-sm text-farmText xs:relative xs:top-1">
                <FormattedMessage id="tvl" defaultMessage="TVL" />
              </span>
              <div className="flex flex-col xs:items-end">
                <span
                  className="text-lg text-white md:py-2 lg:py-2 xs:pb-2"
                  title={poolData.TVLtitle}
                >
                  {poolData.displayTVL}
                </span>
                <span>
                  <RenderDisplayTokensAmounts
                    tokens={tokens}
                    coinsAmounts={poolData.coinsAmounts}
                  />
                </span>
              </div>
            </span>
          </div>

          <div className="col-span-3 xs:pt-4">
            <span className="flex flex-col xs:flex-row xs:justify-between">
              <span className="text-sm text-farmText md:pl-2 lg:pl-2 xs:relative xs:top-1">
                <FormattedMessage id="share" defaultMessage="Share" />
              </span>
              <div className="flex flex-col xs:flex-row">
                <span className="flex items-center pl-2 md:py-2 lg:py-2 xs:pb-2 xs:pr-2">
                  <span className="text-lg text-white ">
                    {poolData.displayMyShareAmount}
                  </span>
                  <span className="text-sm text-farmText pl-3">
                    {poolData.displaySharePercent}
                  </span>
                </span>

                <Link to={'/farms'} target="_blank">
                  {poolData.displayShareInFarm}
                </Link>
              </div>
            </span>
          </div>
        </div>
      </Card>
      <div
        className={`w-full bg-liqBtn flex items-center py-4 px-6 rounded-b-2xl mb-2 ${
          isSignedIn ? 'block' : 'hidden'
        }`}
      >
        <SolidButton
          className="w-full text-center flex items-center justify-center py-3 mr-2 text-sm"
          onClick={() =>
            history.push(`/sauce/${stablePool.id}`, {
              stableTab: 'add_liquidity',
              shares,
              stakeList,
              farmStake,
              pool: stablePool,
            })
          }
        >
          <FormattedMessage id="add_liquidity" defaultMessage="Add Liquidity" />
        </SolidButton>
        <OutlineButton
          className="w-full py-3 ml-2 text-sm h-11"
          onClick={() =>
            history.push(`/sauce/${stablePool.id}`, {
              stableTab: 'remove_liquidity',
              shares,
              stakeList,
              farmStake,
              pool: stablePool,
            })
          }
        >
          <FormattedMessage
            id="remove_liquidity"
            defaultMessage="Remove Liquidity"
          />
        </OutlineButton>
      </div>
      <div
        className={` ${isSignedIn ? 'hidden' : ''} px-6 py-4 mb-2 bg-liqBtn `}
      >
        <ConnectToNearBtn />
      </div>
    </div>
  );
}

export function StableSwapPageEntry() {
  const [pool3tokens, setPool3tokens] = useState<Pool>();
  const [pool2tokens, setPool2tokens] = useState<Pool>();
  const [allStableTokens, setAllStableTokens] = useState<TokenMetadata[]>();

  const { shares: shares3token, stakeList: stakeList3token } =
    usePool(STABLE_POOL_ID);
  const { shares: shares2token, stakeList: stakeList2token } =
    usePool(STABLE_POOL_USN_ID);

  const farmCount2token = useCanFarm(Number(STABLE_POOL_USN_ID));

  const farmCount3token = useCanFarm(Number(STABLE_POOL_ID));

  const farmStake3token = useFarmStake({
    poolId: Number(STABLE_POOL_ID),
    stakeList: stakeList3token,
  });
  const farmStake2token = useFarmStake({
    poolId: Number(STABLE_POOL_USN_ID),
    stakeList: stakeList2token,
  });

  const allStableTokensIds = new Array(
    ...new Set(STABLE_TOKEN_IDS.concat(STABLE_TOKEN_USN_IDS))
  );

  useEffect(() => {
    Promise.all(allStableTokensIds.map((id) => ftGetTokenMetadata(id))).then(
      setAllStableTokens
    );
  }, []);

  const userTotalShare3token = BigNumber.sum(shares3token, farmStake3token);

  const userTotalShare2token = BigNumber.sum(shares2token, farmStake2token);

  useEffect(() => {
    getStablePoolFromCache(STABLE_POOL_USN_ID.toString()).then((res) => {
      setPool2tokens(res[0]);
    });
    getStablePoolFromCache(STABLE_POOL_ID.toString()).then((res) => {
      setPool3tokens(res[0]);
    });
  }, []);

  if (
    !pool3tokens ||
    !pool2tokens ||
    !shares2token ||
    !shares3token ||
    !allStableTokens ||
    !farmStake3token ||
    !farmStake2token
  )
    return <Loading />;
  const tokens2token = STABLE_TOKEN_USN_IDS.map((id) =>
    allStableTokens?.find((token) => token.id === id)
  );

  const tokens3token = STABLE_TOKEN_IDS.map((id) =>
    allStableTokens?.find((token) => token.id === id)
  );
  const poolData2token = formatePoolData({
    pool: pool2tokens,
    userTotalShare: userTotalShare2token,
    farmStake: farmStake2token,
    tokens: tokens2token,
    share: shares2token,
    stakeList: stakeList2token,
    farmCount: farmCount2token,
  });

  const poolData3token = formatePoolData({
    pool: pool3tokens,
    userTotalShare: userTotalShare3token,
    farmStake: farmStake3token,
    tokens: tokens3token,
    share: shares3token,
    stakeList: stakeList3token,
    farmCount: farmCount3token,
  });

  return (
    <div className="m-auto lg:w-580px md:w-5/6 xs:w-full xs:p-2 flex flex-col">
      <div className="flex justify-center -mt-10 mb-2 ">
        <StableSwapLogo />
      </div>
      <span className="text-sm text-primaryText mb-6 text-center">
        <FormattedMessage
          id="sauce_note"
          defaultMessage="SAUCE is designed for liquidity pools with pegged assets, delivering optimal prices."
        />
      </span>
      <StablePoolCard
        stablePool={pool3tokens}
        tokens={tokens3token}
        poolData={poolData3token}
      />
      <StablePoolCard
        stablePool={pool2tokens}
        tokens={tokens2token}
        poolData={poolData2token}
      />

      <TokenReserves
        tokens={allStableTokens}
        pools={[pool2tokens, pool3tokens]}
        hiddenMag={true}
        className="pt-6"
      />
    </div>
  );
}
