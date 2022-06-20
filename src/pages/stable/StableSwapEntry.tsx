import React, { useContext, useEffect, useState } from 'react';
import Loading from '../../components/layout/Loading';
import TokenReserves, {
  calculateTotalStableCoins,
} from '../../components/stableswap/TokenReserves';
import { StableSwapLogo } from '../../components/icon/StableSwap';
import { Link, useHistory } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { Pool } from '../../services/pool';
import { Card } from '../../components/card/Card';
import { TokenMetadata, ftGetTokenMetadata } from '../../services/ft-contract';
import {
  STABLE_POOL_USN_ID,
  STABLE_POOL_ID,
  AllStableTokenIds,
  BTC_STABLE_POOL_ID,
  BTCIDS,
  STNEARIDS,
  STNEAR_POOL_ID,
  CUSDIDS,
  CUSD_STABLE_POOL_ID,
  LINEAR_POOL_ID,
  LINEARIDS,
} from '../../services/near';
import BigNumber from 'bignumber.js';
import { toReadableNumber, percent } from '../../utils/numbers';
import { ShareInFarm } from '../../components/layout/ShareInFarm';
import {
  STABLE_LP_TOKEN_DECIMALS,
  RATED_POOL_LP_TOKEN_DECIMALS,
} from '../../components/stableswap/AddLiquidity';
import {
  toInternationalCurrencySystem,
  toPrecision,
  scientificNotationToString,
} from '../../utils/numbers';
import { ConnectToNearBtn, SolidButton } from '../../components/button/Button';
import { OutlineButton } from '../../components/button/Button';
import { Images, Symbols } from '../../components/stableswap/CommonComp';
import { FarmMiningIcon } from '../../components/icon';
import { getCurrentWallet, WalletContext } from '../../utils/sender-wallet';
import { useStabelPoolData } from '../../state/sauce';
import {
  STABLE_POOL_TYPE,
  isStablePool,
  isRatedPool,
} from '../../services/near';
import { STABLE_TOKEN_IDS, STABLE_TOKEN_USN_IDS } from '../../services/near';
import { useClientMobile } from '~utils/device';

export const getStablePoolDecimal = (id: string | number) => {
  if (isRatedPool(id)) return RATED_POOL_LP_TOKEN_DECIMALS;
  else if (isStablePool(id)) return STABLE_LP_TOKEN_DECIMALS;
};

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
                  className="w-4 h-4 border border-gradientFrom rounded-full"
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

export function formatePoolData({
  pool,
  userTotalShare,
  farmStake,
  tokens,
  shares,
  stakeList,
  farmCount,
  poolTVL,
}: {
  pool: Pool;
  userTotalShare: BigNumber;
  farmStake: string | number;
  tokens: TokenMetadata[];
  shares: string;
  stakeList: Record<string, string>;
  farmCount: Number;
  poolTVL: number;
}) {
  const isSignedIn = getCurrentWallet().wallet.isSignedIn();

  const tokensMap: {
    [id: string]: TokenMetadata;
  } = tokens.reduce((pre, cur) => ({ ...pre, [cur.id]: cur }), {});

  const { coinsAmounts } = calculateTotalStableCoins([pool], tokensMap);

  const parsedUsertotalShare = scientificNotationToString(
    userTotalShare.toString()
  );

  const displayTVL = `$${toInternationalCurrencySystem(poolTVL.toString(), 2)}`;

  const TVLtitle = `${toPrecision(poolTVL.toString(), 2)}`;

  const displayMyShareAmount = isSignedIn
    ? toPrecision(
        toReadableNumber(getStablePoolDecimal(pool.id), parsedUsertotalShare),
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
    shares: shares,
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
  index,
  chosenState,
  setChosesState,
}: {
  stablePool: Pool;
  tokens: TokenMetadata[];
  index: number;
  chosenState: number;
  setChosesState: (index: number) => void;
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

  const { globalState } = useContext(WalletContext);

  const isSignedIn = globalState.isSignedIn;

  const haveFarm = poolData.farmCount > 0;
  const multiMining = poolData.farmCount > 1;
  // const multiMining = false;

  return (
    <div
      className={`w-full flex flex-col relative overflow-hidden rounded-2xl mb-4
      ${
        chosenState === index
          ? 'border border-gradientFrom'
          : 'border border-transparent'
      }
      `}
      onTouchEnd={() => {
        if (chosenState !== index) setChosesState(index);
      }}
    >
      <Card
        width="w-full"
        padding="px-6 pt-8 pb-4"
        rounded="rounded-2xl"
        className={`flex flex-col`}
        onMouseEnter={() => setChosesState(index)}
        onMouseLeave={() => setChosesState(null)}
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
                  className="text-lg lg:w-1/5 whitespace-nowrap text-white md:py-2 lg:py-2 xs:pb-2"
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
                <FormattedMessage id="my_shares" defaultMessage="Shares" />
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

                <Link
                  to={'/farms'}
                  target="_blank"
                  className="relative top-0.5"
                >
                  {poolData.displayShareInFarm}
                </Link>
              </div>
            </span>
          </div>
        </div>
        <div
          className={`w-full  bg-cardBg flex items-center xs:justify-between pt-6 pb-2 ${
            chosenState === index && isSignedIn ? 'block' : 'hidden'
          }`}
        >
          <SolidButton
            className="w-full text-center flex items-center justify-center py-3 mr-2 text-sm"
            onClick={(e) => {
              history.push(`/sauce/${stablePool.id}`, {
                stableTab: 'add_liquidity',
                shares,
                stakeList,
                farmStake,
                pool: stablePool,
              });
            }}
          >
            <FormattedMessage
              id="add_liquidity"
              defaultMessage="Add Liquidity"
            />
          </SolidButton>
          <OutlineButton
            className="w-full py-3 ml-2 text-sm h-11"
            onClick={(e) => {
              history.push(`/sauce/${stablePool.id}`, {
                stableTab: 'remove_liquidity',
                shares,
                stakeList,
                farmStake,
                pool: stablePool,
              });
            }}
          >
            <FormattedMessage
              id="remove_liquidity"
              defaultMessage="Remove Liquidity"
            />
          </OutlineButton>
        </div>
        <div
          className={` ${
            isSignedIn || chosenState !== index ? 'hidden' : ''
          } px-6 pt-6 pb-2 bg-cardBg `}
        >
          <ConnectToNearBtn />
        </div>
      </Card>
    </div>
  );
}

const SauceSelector = ({
  reserveType,
  setReserveType,
}: {
  reserveType: STABLE_POOL_TYPE;
  setReserveType: (reserveType: STABLE_POOL_TYPE) => void;
}) => {
  const TYPES = [
    STABLE_POOL_TYPE.USD,
    STABLE_POOL_TYPE.BTC,
    STABLE_POOL_TYPE.NEAR,
  ];

  return (
    <div className="bg-cardBg rounded-2xl p-1 flex mb-4">
      {TYPES.map((type, i) => {
        return (
          <div
            className={`rounded-xl  ${
              reserveType === TYPES[i]
                ? 'bg-tabChosen'
                : 'cursor-pointer text-primaryText'
            }  text-white text-lg w-full text-center py-2`}
            onClick={() => setReserveType(TYPES[i])}
          >
            {type.toString()}
          </div>
        );
      })}
    </div>
  );
};

const REF_SAUCE_PAGE_STABLE_CLASS_KEY = 'REF_SAUCE_PAGE_STABLE_CLASS_VALUE';

export function StableSwapPageEntry() {
  const [reserveType, setReserveType] = useState<STABLE_POOL_TYPE>(
    STABLE_POOL_TYPE[
      localStorage.getItem(REF_SAUCE_PAGE_STABLE_CLASS_KEY)?.toString()
    ] || STABLE_POOL_TYPE.USD
  );
  const { poolData: pool3tokenData } = useStabelPoolData(STABLE_POOL_ID);
  const { poolData: USNPoolData } = useStabelPoolData(STABLE_POOL_USN_ID);

  const { poolData: BTCPoolData } = useStabelPoolData(BTC_STABLE_POOL_ID);

  const { poolData: STNEARPoolData } = useStabelPoolData(STNEAR_POOL_ID);
  const { poolData: CUSDPoolData } = useStabelPoolData(CUSD_STABLE_POOL_ID);

  const { poolData: LINEARPoolData } = useStabelPoolData(LINEAR_POOL_ID);

  const [chosenState, setChosesState] = useState<number>();

  const [allStableTokens, setAllStableTokens] = useState<TokenMetadata[]>();

  useEffect(() => {
    Promise.all(AllStableTokenIds.map((id) => ftGetTokenMetadata(id))).then(
      setAllStableTokens
    );
  }, []);
  useEffect(() => {
    setChosesState(null);
    localStorage.setItem(
      REF_SAUCE_PAGE_STABLE_CLASS_KEY,
      reserveType.toString()
    );
  }, [reserveType]);

  if (
    !pool3tokenData ||
    !USNPoolData ||
    !BTCPoolData ||
    !CUSDPoolData ||
    !STNEARPoolData ||
    !LINEARPoolData ||
    !allStableTokens
  )
    return <Loading />;

  const formatedPool3tokenData = formatePoolData(pool3tokenData);
  const formatedUSNPoolData = formatePoolData(USNPoolData);
  const formatedBTCPoolData = formatePoolData(BTCPoolData);
  const formatedCUSDPoolData = formatePoolData(CUSDPoolData);

  const formatedSTNEARPoolData = formatePoolData(STNEARPoolData);

  const formatedLINEARPoolData = formatePoolData(LINEARPoolData);

  const displayPoolData =
    reserveType === STABLE_POOL_TYPE.USD
      ? [formatedPool3tokenData, formatedUSNPoolData, formatedCUSDPoolData]
      : reserveType === STABLE_POOL_TYPE.BTC
      ? [formatedBTCPoolData]
      : [formatedSTNEARPoolData, formatedLINEARPoolData];

  const displayPools =
    reserveType === STABLE_POOL_TYPE.USD
      ? [pool3tokenData, USNPoolData, CUSDPoolData]
      : reserveType === STABLE_POOL_TYPE.BTC
      ? [BTCPoolData]
      : [STNEARPoolData, LINEARPoolData];

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
      <SauceSelector
        reserveType={reserveType}
        setReserveType={setReserveType}
      />

      {displayPoolData.map((poolData, i) => {
        return (
          <StablePoolCard
            stablePool={displayPools[i].pool}
            tokens={displayPools[i].tokens}
            poolData={poolData}
            index={i}
            key={i}
            chosenState={chosenState}
            setChosesState={setChosesState}
          />
        );
      })}

      <TokenReserves
        tokens={allStableTokens.filter((token) => {
          switch (reserveType) {
            case 'BTC':
              return BTCIDS.includes(token.id);
            case 'USD':
              return STABLE_TOKEN_IDS.concat(STABLE_TOKEN_USN_IDS)
                .concat(CUSDIDS)
                .map((id) => id.toString())
                .includes(token.id);
            case 'NEAR':
              return STNEARIDS.concat(LINEARIDS).includes(token.id);
          }
        })}
        pools={
          reserveType === STABLE_POOL_TYPE.BTC
            ? [BTCPoolData.pool]
            : reserveType === STABLE_POOL_TYPE.NEAR
            ? [STNEARPoolData.pool, LINEARPoolData.pool]
            : [USNPoolData.pool, pool3tokenData.pool, CUSDPoolData.pool]
        }
        hiddenMag={true}
        className="pt-6"
        type={reserveType}
        setType={setReserveType}
      />
    </div>
  );
}
