import Big from 'big.js';
import BigNumber from 'bignumber.js';
import moment from 'moment';
import React, {
  forwardRef,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { FormattedMessage, useIntl, FormattedRelativeTime } from 'react-intl';
import { NewGradientButton } from '~components/button/Button';
import {
  cancelVote,
  claimRewardVE,
  getProposalList,
  Proposal,
} from '~services/referendum';

import { scientificNotationToString, toPrecision } from '~utils/numbers';
import { Card } from '../card/Card';
import {
  useVEmeta,
  useVoteDetail,
  useUnclaimedProposal,
  useCounterDownVE,
} from '../../state/referendum';
import {
  toReadableNumber,
  toRoundedReadableNumber,
  multiply,
} from '../../utils/numbers';
import { BorderGradientButton } from '../button/Button';
import {
  ModalWrapper,
  CalenderIcon,
  RewardCard,
} from '../../pages/ReferendumPage';
import Modal from 'react-modal';
import { Images, Symbols } from '../stableswap/CommonComp';
import {
  RightArrowVE,
  NoResultChart,
  LeftArrowVE,
  NO_RESULT_CHART,
} from '../icon/Referendum';
import { createProposal, Description } from '../../services/referendum';
import {
  toNonDivisibleNumber,
  percent,
  divide,
  ONLY_ZEROS,
} from '../../utils/numbers';
import {
  ftGetTokensMetadata,
  TokenMetadata,
  ftGetTokenMetadata,
} from '../../services/ft-contract';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';
import { toRealSymbol } from '../../utils/token';
import _, { conformsTo, pad } from 'lodash';
import { CustomSwitch } from '../forms/SlippageSelector';
import { ArrowDownLarge } from '~components/icon';
import { FilterIcon } from '~components/icon/PoolFilter';
import {
  LOVE_TOKEN_DECIMAL,
  VEMETA,
  useVoteDetailHisroty,
} from '../../state/referendum';
import {
  getAccountName,
  getCurrentWallet,
  WalletContext,
} from '../../utils/sender-wallet';
import { Item } from '../airdrop/Item';
import { ShareInFarmV2 } from './ShareInFarm';
import {
  VoteCommon,
  VotePoll,
  VoteDetail,
  addBonus,
} from '../../services/referendum';
import {
  useAccountInfo,
  useVEconfig,
  useUnClaimedRewardsVE,
} from '../../state/referendum';
import SelectToken from '../forms/SelectToken';
import { IconLeft } from '../tokens/Icon';
import { REF_META_DATA, ftGetBalance } from '../../services/ft-contract';
import {
  useTokenPriceList,
  useWhitelistTokens,
  useTokenBalances,
} from '../../state/token';
import { WRAP_NEAR_CONTRACT_ID } from '~services/wrap-near';
import { useDepositableBalance } from '../../state/token';
import { REF_TOKEN_ID, near } from '../../services/near';
import { NewFarmInputAmount } from '../forms/InputAmount';
import {
  VoteAction,
  VoteFarm,
  VEConfig,
  Incentive,
} from '../../services/referendum';
import { VotedIcon } from '../icon/Referendum';
import { useClientMobile, isClientMobie } from '../../utils/device';

import DatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';
import { getCurrentUnixTime } from '../../services/api';
import { useHistory, useParams } from 'react-router-dom';
import { checkAllocations } from '../../utils/numbers';
import { QuestionTip } from './TipWrapper';

const REF_FI_PROPOSALTAB = 'REF_FI_PROPOSALTAB_VALUE';

export const getCurUTCDate = (base?: Date) => {
  let now = new Date();
  if (base) now = new Date(base);
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

  return utc;
};

export const timeStampToUTC = (ts: number) => {
  return moment(ts * 1000)
    .utc()
    .format('yyyy-MM-DD HH:mm:ss');
};

export const dateToUnixTimeSec = (date: Date) => {
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  ).getTime();

  return Math.floor(local / 1000);
};

export const addDays = (days: number, base?: Date) => {
  const curDate = getCurUTCDate(base);
  curDate.setDate(curDate.getDate() + days);

  return curDate;
};

export const addSeconds = (secs: number, base?: Date) => {
  const curDate = getCurUTCDate(base);
  return new Date(curDate.getTime() + secs * 1000);
};

export const addHours = (date: Date, hours?: number) => {
  const newDate = date;

  newDate.setHours(date.getHours() + (hours | 0));

  return newDate;
};

export const CustomDatePicker = ({
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  forEnd,
  setOpenPicker,
  openPicker,
  veconfig,
}: {
  startTime: Date;
  setStartTime: (d: Date) => void;
  endTime?: Date;
  setEndTime?: (d: Date) => void;
  forEnd?: boolean;
  openPicker?: boolean;
  setOpenPicker: (o: boolean) => void;
  veconfig: VEConfig;
}) => {
  const minDate = addSeconds(
    (veconfig?.min_proposal_start_vote_offset_sec || 0) + 3600
  );

  const onChange = (date: Date) => {
    if (forEnd) {
      setEndTime(date);
    } else {
      setStartTime(date);
    }
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getMinTime = () => {
    if (forEnd) {
      if (isSameDay(startTime, endTime)) {
        const h1 = startTime.getHours();

        return new Date(getCurUTCDate().setHours(h1 + 1, 0, 0, 0));
      } else {
        return new Date(getCurUTCDate().setHours(0, 0, 0, 0));
      }
    } else {
      if (isSameDay(startTime, minDate)) {
        const h1 = minDate.getHours();

        const m1 = minDate.getMinutes();

        return new Date(
          getCurUTCDate().setHours(
            m1 > 30 ? h1 + 1 : h1,
            m1 > 30 ? 0 : 30,
            0,
            0
          )
        );
      } else {
        return new Date(getCurUTCDate().setHours(0, 0, 0, 0));
      }
    }
  };

  const getMaxTime = () => {
    return new Date(
      getCurUTCDate().setHours(0, 0, 0, 0) + 24 * 60 * 60 * 1000 - 1
    );
  };

  const getMinDate = () => {
    if (forEnd) {
      return startTime;
    } else {
      return minDate;
    }
  };

  return (
    <DatePicker
      showTimeSelect
      selected={forEnd ? endTime : startTime}
      onChange={onChange}
      minDate={getMinDate()}
      minTime={getMinTime()}
      maxTime={getMaxTime()}
      dateFormat="yyyy-MM-dd hh:mm:ss aa"
      preventOpenOnFocus={true}
      open={openPicker}
      onClickOutside={(e) => {
        e.stopPropagation();
        setOpenPicker(false);
      }}
      onKeyDown={(e) => {
        e.preventDefault();
      }}
    />
  );
};

const VotePopUp = (
  props: Modal.Props & {
    tokens?: TokenMetadata[];
    votedThisFarm: string;
    myPower: string;
    ratioOld: string;
    ratioNew: string;
    allocationOld: string;
    allocationNew: string;
    proposal_id: number;
    index: number;
    curVotedVe: string;
  }
) => {
  const {
    tokens,
    votedThisFarm,
    myPower,
    ratioNew,
    ratioOld,
    allocationNew,
    allocationOld,
    proposal_id,
    index,
    curVotedVe,
  } = props;

  const InfoRow = ({
    title,
    value,
  }: {
    title: string | JSX.Element;
    value: string | JSX.Element;
  }) => {
    return (
      <div className="flex items-center justify-between text-sm py-2">
        <span className="text-primaryText">{title}</span>

        <span className="text-white">{value}</span>
      </div>
    );
  };

  return (
    <ModalWrapper title={null} {...props}>
      <div className="flex flex-col items-center">
        <Images tokens={tokens} size={'10'} />
        <div className="py-1"></div>
        <Symbols tokens={tokens} size={'text-xl'} seperator={'-'} />

        <div className="pt-7 w-full">
          <InfoRow
            title={
              <FormattedMessage
                id="currently_voted"
                defaultMessage={'Currently voted'}
              />
            }
            value={votedThisFarm}
          />

          <InfoRow
            title={
              <FormattedMessage
                id="my_voting_power"
                defaultMessage={'My voting power'}
              />
            }
            value={myPower}
          />

          <InfoRow
            title={
              <FormattedMessage
                id="voting_ratio"
                defaultMessage={'Voting ratio '}
              />
            }
            value={
              <span className="flex items-center">
                <span className="text-primaryText">{ratioOld}</span>
                <span className="px-3">
                  <RightArrowVE />
                </span>

                <span>{ratioNew}</span>
              </span>
            }
          />

          <InfoRow
            title={
              <FormattedMessage
                id="currently_REF_allocation"
                defaultMessage={'Currently REF allocation'}
              />
            }
            value={
              <span className="flex items-center">
                <span className="text-primaryText">{allocationOld}</span>
                <span className="px-3">
                  <RightArrowVE />
                </span>

                <span>{allocationNew}</span>
              </span>
            }
          />
        </div>

        <NewGradientButton
          text={<FormattedMessage id="vote" defaultMessage={'Vote'} />}
          className="w-full text-lg py-4 mt-6"
          onClick={() => {
            VoteFarm({
              proposal_id,
              index,
            });
          }}
          beatStyling
        />
      </div>
    </ModalWrapper>
  );
};

const AddBonusPopUp = (
  props: Modal.Props & {
    title: JSX.Element | string;
    proposal_id: number;
    curIncentiveToken: TokenMetadata | null;
    curIncentive?: Incentive;
  }
) => {
  const { proposal_id, curIncentiveToken, curIncentive } = props;
  const [selectToken, setSelectToken] = useState<TokenMetadata>(
    curIncentiveToken ? curIncentiveToken : REF_META_DATA
  );

  useEffect(() => {
    if (curIncentiveToken) {
      setSelectToken(curIncentiveToken);
    }
  }, [curIncentiveToken]);

  const [hoverSelectToken, setHoverSelectToken] = useState<boolean>(false);
  const tokenPriceList = useTokenPriceList();

  const tokens = useWhitelistTokens();

  const nearBalance = useDepositableBalance('NEAR');

  const balances = useTokenBalances();

  const balance = useDepositableBalance(selectToken.id || REF_TOKEN_ID);

  const [value, setValue] = useState<string>('');
  const list = ['by voter number equally', 'by voting power equally'];

  const [curOption, setCurOption] = useState<string>(
    curIncentive?.incentive_type === 'Evenly' || !curIncentive?.incentive_type
      ? list[0]
      : list[1]
  );

  const getMax = function (id: string, max: string) {
    return id !== WRAP_NEAR_CONTRACT_ID
      ? max
      : Number(max) <= 0.5
      ? '0'
      : String(Number(max) - 0.5);
  };

  return (
    <ModalWrapper {...props}>
      <div className="flex items-center justify-between py-5">
        <SelectToken
          tokenPriceList={tokenPriceList}
          tokens={tokens}
          forCross
          selected={
            <div
              className="flex font-semibold "
              onMouseEnter={() => setHoverSelectToken(true)}
              onMouseLeave={() => setHoverSelectToken(false)}
            >
              {selectToken ? (
                <IconLeft
                  token={selectToken}
                  hover={hoverSelectToken}
                  size="8"
                />
              ) : null}
            </div>
          }
          onSelect={curIncentive ? null : setSelectToken}
          balances={balances}
        />

        <div className="text-xs text-primaryText flex items-center">
          <FormattedMessage id="balance" defaultMessage={'Balance'} />: &nbsp;
          <span>
            {toPrecision(
              toReadableNumber(
                selectToken.decimals,

                selectToken.id === WRAP_NEAR_CONTRACT_ID ? nearBalance : balance
              ) || '0',
              2
            )}
          </span>
        </div>
      </div>

      <NewFarmInputAmount
        max={
          getMax(
            selectToken.id,
            toReadableNumber(
              selectToken.decimals,
              selectToken.id === WRAP_NEAR_CONTRACT_ID ? nearBalance : balance
            )
          ) || '0'
        }
        value={value}
        onChangeAmount={setValue}
      />

      <div className="py-8 ">
        <div className="text-white pb-6">
          <FormattedMessage id="allocate" defaultMessage={'Allocate'} />
        </div>

        <SelectUI
          curvalue={curOption}
          list={list}
          onChange={setCurOption}
          labelClassName="w-full text-sm py-5"
          dropDownClassName="w-full top-11 bg-selectUI"
          canSelect={!curIncentiveToken}
        />
      </div>

      <NewGradientButton
        text={<FormattedMessage id="deposit" defaultMessage={'Deposit'} />}
        className="w-full"
        disabled={
          !value ||
          !selectToken ||
          new Big(value).gt(
            getMax(
              selectToken.id,
              toReadableNumber(
                selectToken.decimals,
                selectToken.id === WRAP_NEAR_CONTRACT_ID ? nearBalance : balance
              )
            )
          ) ||
          ONLY_ZEROS.test(value)
        }
        onClick={() => {
          addBonus({
            tokenId: selectToken.id,
            amount: value,
            incentive_type: curIncentive
              ? curIncentive.incentive_type
              : list.indexOf(curOption) === 0
              ? 'Evenly'
              : 'Proportion',
            proposal_id,
          });
        }}
        beatStyling
      />
    </ModalWrapper>
  );
};

export const TIMESTAMP_DIVISOR = 1000000000;

enum PROPOSAL_TAB {
  FARM = 'FARM',
  GOV = 'GOV',
}
const PAIR_SEPERATOR = '|';

export const durationFomatter = (duration: moment.Duration) => {
  return `${duration.days()}d: ${duration.hours()}h: ${duration.minutes()}m`;
};

const VoteChart = ({
  options,
  ratios,
  forDetail,
}: {
  options: string[];
  ratios: string[];
  forDetail?: boolean;
}) => {
  const data = ratios.map((r, i) => {
    return {
      name: options[i],
      value: Math.round(Number(r) * 100) / 100,
    };
  });

  if (
    !options ||
    !ratios ||
    data?.length === 0 ||
    ratios.every((r) => Number(r) === 0)
  )
    return (
      <div className="pr-10">
        <NoResultChart expand={forDetail ? '1.25' : ''} />
      </div>
    );

  const [activeIndex, setActiveIndex] = useState<number>(-1);

  function customLabel(props: any) {
    let { cx, cy, index, value, name } = props;

    if (index !== activeIndex) return null;

    return (
      <g>
        <foreignObject
          x={cx - (forDetail ? 50 : 35)}
          y={cy - 20}
          width={`${name.length * 13 > 70 ? 70 : name.length * 13}%`}
          height={100}
        >
          <div
            className="pt-1 pb-2 px-1 flex flex-col rounded-lg bg-voteLabel text-xs border border-black border-opacity-10"
            style={{
              backdropFilter: 'blur(30px)',
            }}
          >
            <div className="flex items-center justify-between pb-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm mr-1 flex-shrink-0 "
                style={{
                  backgroundColor: OPTIONS_COLORS[activeIndex] || '#8EA0CF',
                }}
              ></div>

              <div className="text-right truncate" title={name}>
                {name}
              </div>
            </div>
            <div className="self-end">{value}%</div>
          </div>
        </foreignObject>
      </g>
    );
  }

  const innerRadius = forDetail ? 62 : 42;
  const outerRadius = forDetail ? 80 : 60;
  return (
    <ResponsiveContainer
      className={`flex items-center relative right-${forDetail ? 0 : 5}`}
      width={161}
      height={forDetail ? 161 : 121}
    >
      <PieChart>
        <Pie
          data={data}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          labelLine={false}
          cx="50%"
          cy="50%"
          activeIndex={activeIndex}
          label={customLabel}
          isAnimationActive={false}
        >
          {data.map((entry, index) => {
            return (
              <Cell
                key={`cell-${index}`}
                fill={OPTIONS_COLORS[options.indexOf(entry.name)] || '#8EA0CF'}
                stroke="#304048"
                strokeOpacity={10}
                strokeWidth={2}
                onMouseEnter={() => setActiveIndex(index)}
                // onMouseLeave={() => setActiveIndex(-1)}
              />
            );
          })}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

const OPTIONS_COLORS = [
  '#00D6AF',
  '#855DF8',
  '#5A6780',
  '#8EA0CF',
  '#57678F',
  '#464F65',
  '#3D455B',
];

function SelectUI({
  onChange,
  list,
  curvalue,
  shrink,
  className,
  size,
  labelClassName,
  dropDownClassName,
  canSelect,
}: {
  onChange: (e: any) => void;
  list: string[];
  curvalue: string;
  shrink?: string;
  className?: string;
  size?: string;
  labelClassName?: string;
  dropDownClassName?: string;
  canSelect?: boolean;
}) {
  const [showSelectBox, setShowSelectBox] = useState(false);
  const switchSelectBoxStatus = () => {
    canSelect && setShowSelectBox(!showSelectBox);
  };
  const hideSelectBox = () => {
    setShowSelectBox(false);
  };
  return (
    <div
      className={`${className} relative flex ${
        shrink ? 'items-end' : 'items-center '
      } outline-none`}
    >
      <span
        onClick={switchSelectBoxStatus}
        tabIndex={-1}
        onBlur={hideSelectBox}
        className={`${labelClassName} flex items-center justify-between bg-black bg-opacity-20 w-24 h-5 rounded-md px-2.5 py-3  cursor-pointer ${
          size || 'text-xs'
        } outline-none ${shrink ? 'xs:w-8 md:w-8' : ''} text-white`}
      >
        <label
          className={`whitespace-nowrap ${shrink ? 'xs:hidden md:hidden' : ''}`}
        >
          {curvalue ? curvalue : null}
        </label>
        <span className="text-primaryText">
          <ArrowDownLarge />
        </span>
      </span>
      <div
        className={`${dropDownClassName} absolute z-50 top-8 right-0 bg-selectUI rounded-2xl px-2  text-sm w-28 ${
          showSelectBox ? '' : 'hidden'
        }`}
        style={{
          border: '1px solid #415462',
        }}
      >
        {list.map((item: string, index) => (
          <p
            key={index}
            onMouseDown={() => {
              onChange(item);
            }}
            className={`flex rounded-lg items-center p-4 h-5 text-white text-opacity-40 my-2 cursor-pointer hover:bg-black hover:bg-opacity-20 hover:text-opacity-100
            ${item == curvalue ? 'bg-black bg-opacity-20 text-opacity-100' : ''}
            `}
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

export const ProposalWrapper = (
  props: any & { show: boolean; bgcolor?: string }
) => {
  const { show, bgcolor } = props;
  return (
    <Card
      padding={'p-8'}
      width="w-full"
      bgcolor={bgcolor}
      className={!show ? 'hidden' : 'text-primaryText '}
    >
      {props.children}
    </Card>
  );
};

export const GradientWrapper = (props: any & { padding: string }) => {
  return (
    <Card className="w-full" bgcolor="bg-veCardGradient" {...props}>
      {props.children}
    </Card>
  );
};

export const PreviewPopUp = (
  props: Modal.Props & {
    title: JSX.Element | string;
    customWidth?: string;
    customHeight?: string;
    timeDuration?: JSX.Element;
    show: boolean;
    setShow: (s: boolean) => void;
    turnOut: string;
    totalVE: string;
    options: string[];
    voted?: VoteAction | 'VoteReject' | 'VoteApprove';
    link: string;
    contentTitle: string;
    type: string;
    index: number;
    startTime: Date;
    setStartTime: (d: Date) => void;
    endTime: Date;
    setEndTime: (d: Date) => void;
  }
) => {
  const {
    title,
    link,
    setShow,
    timeDuration,
    show,
    turnOut,
    totalVE,
    options,
    voted,
    contentTitle,
    type,
    index,
    startTime,
    setStartTime,
    endTime,
    setEndTime,
  } = props;

  const displayLink =
    (new RegExp('https://').test(link) || new RegExp('http://').test(link)) &&
    link.indexOf(link) === 0
      ? link
      : `https://${link}`;

  const intl = useIntl();

  const data = options.map((o, i) => {
    return {
      option: o,
      v: '0',
      ratio: `0`,
    };
  });

  const InfoRow = ({
    name,
    value,
    nameClass,
    valueClass,
  }: {
    name: string | JSX.Element;
    value: string | JSX.Element;
    nameClass?: string;
    valueClass?: string;
  }) => {
    return (
      <div className="py-2.5 flex items-center ">
        <span className={`${nameClass} text-primaryText`}>{name}</span>
        <span className={`${valueClass} ml-3`}>{value}</span>
      </div>
    );
  };

  return (
    <ModalWrapper {...props}>
      <Card
        className="w-full relative overflow-auto mt-9"
        bgcolor="bg-black bg-opacity-20 "
        padding={`px-10 pb-9  `}
      >
        <div className="pb-4 border-b border-white border-opacity-10 px-2 pt-8 text-white text-xl mb-4">
          {contentTitle}
        </div>

        <InfoRow
          name={intl.formatMessage({
            id: 'proposer',
            defaultMessage: 'Proposer',
          })}
          value={`${getAccountName(getCurrentWallet().wallet.getAccountId())}`}
          valueClass={'font-bold'}
        />

        <InfoRow
          name={intl.formatMessage({
            id: 'voting_period',
            defaultMessage: 'Voting Period',
          })}
          value={`${moment(startTime).format('yyyy-MM-DD HH:mm:ss')} - ${moment(
            endTime
          ).format('yyyy-MM-DD HH:mm:ss')} UTC`}
        />
        <InfoRow
          name={intl.formatMessage({
            id: 'turn_out',
            defaultMessage: 'Turnout',
          })}
          value={turnOut}
        />
        <div className="w-full relative flex items-center justify-between pb-4 border-b border-white border-opacity-10">
          <InfoRow
            name={intl.formatMessage({
              id: 'total_velpt',
              defaultMessage: 'Total veLPT',
            })}
            value={toPrecision(totalVE, 2)}
          />

          <button
            className={`flex items-center ${
              !link ? 'cursor-not-allowed' : ''
            } `}
            onClick={() => {
              link && window.open(displayLink, '_blank');
            }}
          >
            <span>
              <FormattedMessage
                id="forum_discussion"
                defaultMessage={'Forum Discussion'}
              />
            </span>

            <span className="text-gradientFrom ml-2">↗</span>
          </button>
        </div>

        <div className="flex items-center justify-center mt-8 pb-6">
          <div className="w-1/5 flex items-center justify-center self-start pt-10">
            <NoResultChart expand="1.25" />
          </div>

          <div className="w-4/5 text-primaryText flex flex-col ml-16 pb-6 ">
            <div className="grid grid-cols-10 pb-5 px-6">
              <span className="col-span-6 ">
                <FormattedMessage id="options" defaultMessage={'Options'} />
              </span>
              <span className="col-span-2  ">
                <FormattedMessage id="ratio" defaultMessage={'Ratio'} />
              </span>
              <span className="col-span-2 text-right">veLPT</span>
            </div>

            <div className="flex flex-col w-full text-white">
              {data?.map((d, i) => {
                return (
                  <div className="grid grid-cols-10 hover:bg-chartBg hover:bg-opacity-20 rounded-lg px-6 py-4">
                    <span className="col-span-6 flex items-center">
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{
                          backgroundColor:
                            OPTIONS_COLORS[i % OPTIONS_COLORS.length] ||
                            'black',
                        }}
                      ></div>
                      <span className="mx-2 truncate w-3/5" title={d.option}>
                        {d.option}
                      </span>
                    </span>

                    <span className="col-span-2 ">
                      {toPrecision(scientificNotationToString(d.ratio), 2)}%
                    </span>

                    <span className="col-span-2 text-right">
                      {toPrecision(d.v, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end pt-8">
        <NewGradientButton
          text={<FormattedMessage id="create" defaultMessage={'Create'} />}
          disabled={
            dateToUnixTimeSec(endTime) - dateToUnixTimeSec(startTime) <= 0 ||
            !link?.trim() ||
            !contentTitle?.trim() ||
            options.filter((_) => !!_.trim()).length < 2
          }
          onClick={() => {
            createProposal({
              description: {
                title: `${contentTitle}`,
                link,
              },
              duration_sec:
                dateToUnixTimeSec(endTime) - dateToUnixTimeSec(startTime),
              kind: type === 'Poll' ? 'Poll' : 'Common',
              options,
              start: dateToUnixTimeSec(startTime),
            });
          }}
        />
      </div>
    </ModalWrapper>
  );
};

const FarmChart = ({
  ratio,
  size,
  voted,
  innerRadiusProp,
  outerRadiusProp,
  forLastRound,
}: {
  ratio: {
    name: string;
    value: number;
    pairSymbol: string;
    tokens: TokenMetadata[];
    allocation: string;
    r: string;
    veLPT: string;
  }[];
  size: number;
  voted: number;
  innerRadiusProp?: number;
  outerRadiusProp?: number;
  forLastRound?: boolean;
}) => {
  if (!ratio) return null;
  const [activeIndex, setActiveIndex] = useState<number>();

  const emptyVote = ratio.every((r, i) => r.value === 0);

  const data = emptyVote
    ? ratio.map((r, i) => {
        const newr = JSON.parse(JSON.stringify(r));
        newr.value = (1 / ratio.length) * 0.99;
        return newr;
      })
    : ratio.filter((r) => r.value > 0);

  const ActiveLabel = () => {
    const activeFarm = data[activeIndex];

    return (
      <div
        className={`rounded-lg relative top-12 border w-full border-gradientFrom px-3 pt-6 pb-3 flex flex-col ${
          forLastRound ? 'text-sm' : 'text-base'
        }`}
        style={{
          backgroundColor: 'rgba(26, 35, 41, 0.6)',
          backdropFilter: 'blur(50px)',
          WebkitBackdropFilter: 'blur(50px)',
        }}
      >
        {voted === activeIndex ? (
          <NewGradientButton
            text={
              <FormattedMessage id="you_voted" defaultMessage={'You Voted'} />
            }
            className=" absolute text-white text-sm top-0 right-1/2 transform translate-x-1/2 -translate-y-1/2 opacity-100"
            padding="px-2 py-2.5"
          />
        ) : null}
        <div className="flex items-center justify-between w-full pb-2">
          <Images tokens={activeFarm.tokens} size="6" />
          <Symbols
            tokens={activeFarm.tokens}
            seperator={'-'}
            size="text-base"
          />
        </div>

        <div className="flex items-center justify-between pb-2">
          <span className="text-primaryText">
            <FormattedMessage id="voted_veLPT" defaultMessage={'Voted veLPT'} />
          </span>

          <span className="text-white">
            {toPrecision(activeFarm.veLPT, 2, true)}
          </span>
        </div>

        <div className="flex items-center justify-between pb-2">
          <span className="text-primaryText">
            <FormattedMessage id="ratio" defaultMessage={'Ratio'} />
          </span>

          <span className="text-white">{activeFarm.r}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-primaryText">
            <FormattedMessage
              id="ref_allocation"
              defaultMessage={'REF allocation'}
            />
          </span>

          <span className="text-white">{activeFarm.allocation}</span>
        </div>
      </div>
    );
  };

  const color = ['#51626B', '#667A86', '#849DA8', '#B5C9CA'];

  function customLabel(props: any) {
    let {
      cx,
      cy,
      x,
      y,
      midAngle,
      innerRadius,
      outerRadius,
      percent,
      pairSymbol,
      index,
    } = props;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x1 = cx + radius * Math.cos(-midAngle * RADIAN) - 15;
    const y1 = cy + radius * Math.sin(-midAngle * RADIAN) - 15;
    if (y < cy) {
      y = y - 30;
    }

    return (
      <g>
        <text
          x={x}
          y={y + 10}
          fill="#91A2AE"
          fontSize="14px"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
        >
          {pairSymbol}
        </text>
        <text
          x={x}
          y={y + 30}
          fill="#91A2AE"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
        >
          {`${emptyVote ? '-' : (percent * 100).toFixed(2)}%`}
        </text>
        {index === activeIndex ? (
          <foreignObject
            x={cx - 100}
            y={cy - 130}
            height={`220`}
            width={forLastRound ? '200' : `250`}
          >
            <ActiveLabel />
          </foreignObject>
        ) : null}
      </g>
    );
  }

  const renderActiveShape = (props: any) => {
    const RADIAN = Math.PI / 180;
    const {
      cx,
      cy,
      midAngle,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      percent,
      value,
      index,
    } = props;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius - 2) * cos;
    const sy = cy + (outerRadius - 2) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 30;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={0}
          outerRadius={innerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={'#00FFD1'}
          opacity="0.1"
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={innerRadius - 10}
          outerRadius={outerRadius}
          fill={'#00FFD1'}
          stroke={'#1D2932'}
          strokeWidth={2}
        />
      </g>
    );
  };

  const innerRadius = innerRadiusProp || 140;
  const outerRadius = outerRadiusProp || 170;
  return (
    <ResponsiveContainer width={'100%'} height={forLastRound ? 350 : 500}>
      <PieChart>
        <Pie
          data={data}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          dataKey="value"
          labelLine={false}
          label={customLabel}
          cx="50%"
          cy="50%"
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          isAnimationActive={false}
        >
          {data.map((entry, index) => {
            return (
              <Cell
                key={`cell-${index}`}
                fill={color[index]}
                stroke="#1D2932"
                strokeWidth={2}
                onMouseMove={() => setActiveIndex(index)}
              />
            );
          })}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

const GovItemDetail = ({
  show,
  proposal,
  setShow,
  timeDuration,
  description,
  turnOut,
  totalVE,
  options,
  voted,
  incentiveToken,
  forPreview,
  veShare,
  unClaimed,
}: {
  show?: number;
  proposal: Proposal;
  setShow: (s: number) => void;
  timeDuration?: JSX.Element;
  description: Description;
  turnOut: string;
  totalVE: string;
  options: string[];
  voted: VoteAction | 'VoteReject' | 'VoteApprove';
  incentiveToken: TokenMetadata;
  forPreview?: boolean;
  veShare: string;
  unClaimed?: boolean;
}) => {
  const intl = useIntl();

  const startTime = Math.floor(Number(proposal?.start_at) / TIMESTAMP_DIVISOR);
  const endTime = Math.floor(Number(proposal?.end_at) / TIMESTAMP_DIVISOR);

  const link = description.link;

  const displayLink =
    (new RegExp('https://').test(link) || new RegExp('http://').test(link)) &&
    link.indexOf(link) === 0
      ? link
      : `https://${link}`;

  const dataRaw = (
    proposal?.kind?.Common ? proposal?.votes?.slice(0, 2) : proposal?.votes
  )?.map((v, i) => {
    return {
      option: proposal?.kind?.Common
        ? i === 0
          ? 'Yes'
          : 'No'
        : proposal?.kind?.Poll?.options?.[i],
      v: toReadableNumber(LOVE_TOKEN_DECIMAL, v || '0'),
      ratio: toPrecision(
        scientificNotationToString(
          new Big(toReadableNumber(LOVE_TOKEN_DECIMAL, v || '0'))
            .div(new Big(Number(totalVE) > 0 ? totalVE : 1))
            .times(100)
            .toString()
        ),
        2
      ),
    };
  });

  const ratios = checkAllocations(
    ONLY_ZEROS.test(totalVE) ? '0' : '100',
    dataRaw?.map((d) => d.ratio)
  );

  const veLPTs = checkAllocations(
    toPrecision(totalVE, 2),
    dataRaw?.map((d) => toPrecision(d.v, 2))
  );

  const data = dataRaw.map((d, i) => {
    (d.ratio = ratios[i]), (d.v = veLPTs[i]);
    return d;
  });

  const InfoRow = ({
    name,
    value,
    nameClass,
    valueClass,
  }: {
    name: string | JSX.Element;
    value: string | JSX.Element;
    nameClass?: string;
    valueClass?: string;
  }) => {
    return (
      <div className="py-2.5 flex items-center ">
        <span className={`${nameClass} text-primaryText`}>{name}</span>
        <span className={`${valueClass} ml-3`}>{value}</span>
      </div>
    );
  };

  const [showAddBonus, setShowAddBonus] = useState<boolean>(false);

  const [showVotePop, setShowVotePop] = useState<boolean>(false);

  const history = useHistory();

  return !show ? null : (
    <div className="text-white text-sm relative">
      <div
        className={`${
          forPreview ? 'hidden' : ''
        } text-center relative text-xl pb-7`}
      >
        <FormattedMessage
          id="proposal_detail"
          defaultMessage={'Proposal Detail'}
        />

        <button
          className="absolute left-0 top-2 text-sm text-primaryText flex items-center"
          onClick={() => {
            history.push('/referendum');
            setShow(undefined);
          }}
        >
          <span className="transform scale-50">
            {<LeftArrowVE stroke="#7E8A93" strokeWidth={2} />}
          </span>
          <span className="ml-1">
            <FormattedMessage id="back" defaultMessage={'Back'} />
          </span>
        </button>
        {proposal?.status === 'InProgress' ? (
          <span className={'text-gradientFrom text-sm absolute right-0 top-2'}>
            {durationFomatter(
              moment.duration(
                Math.floor(Number(proposal.end_at) / TIMESTAMP_DIVISOR) -
                  moment().unix(),
                'seconds'
              )
            )}
            {` left`}
          </span>
        ) : null}

        <span className="absolute right-1">{timeDuration}</span>
      </div>
      {!voted || forPreview ? null : (
        <div
          className={`${
            proposal?.status === 'Expired' ? 'opacity-30' : ''
          } absolute -right-4 top-10`}
        >
          <VotedIcon />
        </div>
      )}
      <Card
        className="w-full relative overflow-hidden"
        bgcolor="bg-black bg-opacity-20 "
        padding={`px-10 pt-9 ${
          proposal?.incentive && incentiveToken ? 'pb-12' : 'pb-9'
        }`}
      >
        <div className="pb-4 border-b border-white border-opacity-10 px-2 pt-8 text-white text-xl mb-4">
          {description.title}
        </div>

        <InfoRow
          name={intl.formatMessage({
            id: 'proposer',
            defaultMessage: 'Proposer',
          })}
          value={getAccountName(proposal.proposer)}
          valueClass={'font-bold'}
        />

        <InfoRow
          name={intl.formatMessage({
            id: 'voting_period',
            defaultMessage: 'Voting Period',
          })}
          value={`${timeStampToUTC(startTime)} - ${timeStampToUTC(
            endTime
          )} UTC`}
        />
        <InfoRow
          name={intl.formatMessage({
            id: 'turn_out',
            defaultMessage: 'Turnout',
          })}
          value={turnOut}
        />
        <div className="w-full relative flex items-center justify-between pb-4 border-b border-white border-opacity-10">
          <InfoRow
            name={intl.formatMessage({
              id: 'voted_veLPT',
              defaultMessage: 'Voted veLPT',
            })}
            value={toPrecision(totalVE, 2)}
          />

          <button
            className="flex items-center "
            onClick={() => {
              window.open(displayLink, '_blank');
            }}
          >
            <span>
              <FormattedMessage
                id="forum_discussion"
                defaultMessage={'Forum Discussion'}
              />
            </span>

            <span className="text-gradientFrom ml-2">↗</span>
          </button>
        </div>

        <div className="flex items-center justify-center mt-8 pb-6">
          <div className="w-1/5 flex items-center justify-center">
            {proposal?.status === 'WarmUp' ? (
              <NoResultChart expand="1.25" />
            ) : (
              <VoteChart
                options={data?.map((d) => d.option)}
                ratios={checkAllocations(
                  ONLY_ZEROS.test(totalVE) ? '0' : '100',
                  data?.map((d) => d.ratio)
                )}
                forDetail
              />
            )}
          </div>

          <div className="w-4/5 text-primaryText flex flex-col ml-16 pb-6 ">
            <div className="grid grid-cols-10 pb-5 px-6">
              <span className="col-span-6 ">
                <FormattedMessage id="options" defaultMessage={'Options'} />
              </span>
              <span className="col-span-2  ">
                <FormattedMessage id="ratio" defaultMessage={'Ratio'} />
              </span>
              <span className="col-span-2 text-right">veLPT</span>
            </div>

            <div className="flex flex-col w-full text-white">
              {data
                .sort((a, b) => {
                  return Number(b.v) - Number(a.v);
                })
                ?.map((d, i) => {
                  const optionId = options.indexOf(d.option);
                  const votedThisOption =
                    voted &&
                    (proposal?.kind?.Common
                      ? (0 === optionId && voted === 'VoteApprove') ||
                        (1 === optionId && voted === 'VoteReject')
                      : (voted as VoteAction)?.VotePoll?.poll_id === optionId);
                  return (
                    <div className="grid grid-cols-10 hover:bg-chartBg hover:bg-opacity-20 rounded-lg px-6 py-4">
                      <span className="col-span-6 flex items-center">
                        <div
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{
                            backgroundColor:
                              OPTIONS_COLORS[options.indexOf(d.option)] ||
                              '#8EA0CF',
                          }}
                        ></div>
                        <span
                          className="mx-2"
                          style={{
                            maxWidth: '60%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={d.option}
                        >
                          {d.option}
                        </span>
                        {i === 0 && !ONLY_ZEROS.test(totalVE) ? (
                          <span
                            className=""
                            style={{
                              color:
                                OPTIONS_COLORS[options.indexOf(d.option)] ||
                                '#8EA0CF',
                            }}
                          >
                            Top
                          </span>
                        ) : null}
                        {!votedThisOption ? null : (
                          <NewGradientButton
                            className="ml-2 text-xs h-4 flex items-center py-3 cursor-default"
                            padding="px-2 py-2.5"
                            text={
                              <FormattedMessage
                                id="you_voted"
                                defaultMessage={'You voted'}
                              />
                            }
                          />
                        )}
                      </span>

                      <span className="col-span-2 ">{d.ratio}%</span>

                      <span className="col-span-2 text-right">{d.v}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end pt-6 border-t border-white border-opacity-10">
          {(voted || proposal?.status === 'Expired') && !unClaimed ? (
            <BorderGradientButton
              text={
                voted && proposal?.status === 'InProgress' ? (
                  <FormattedMessage id="cancel" defaultMessage={'Cancel'} />
                ) : !voted ? (
                  <FormattedMessage id="ended_ve" defaultMessage={'Ended'} />
                ) : (
                  <FormattedMessage id="voted" defaultMessage={'Voted'} />
                )
              }
              color={'#192734'}
              width="w-20"
              padding="px-0 py-2.5"
              onClick={() =>
                cancelVote({
                  proposal_id: proposal?.id,
                })
              }
              disabled={proposal?.status === 'Expired'}
            />
          ) : (
            <NewGradientButton
              text={
                unClaimed ? (
                  <FormattedMessage
                    id="claim_reward"
                    defaultMessage={'Claim Reward'}
                  />
                ) : proposal?.status === 'InProgress' &&
                  ONLY_ZEROS.test(veShare) ? (
                  <FormattedMessage id="no_veLPT" defaultMessage={'No veLPT'} />
                ) : (
                  <FormattedMessage id="vote" defaultMessage={'Vote'} />
                )
              }
              onClick={() => {
                unClaimed
                  ? claimRewardVE({
                      proposal_id: proposal?.id,
                    })
                  : setShowVotePop(true);
              }}
              padding="px-0 py-2.5"
              disabled={
                (proposal?.status !== 'InProgress' ||
                  (proposal?.status === 'InProgress' &&
                    ONLY_ZEROS.test(veShare))) &&
                !unClaimed
              }
              className={unClaimed ? 'w-28' : 'w-20'}
            />
          )}
        </div>
        {proposal?.incentive && incentiveToken ? (
          <div
            className={`absolute w-full h-8 bg-veGradient bottom-0 right-0 flex items-center text-center justify-center text-white ${
              proposal?.status === 'Expired' ? 'opacity-30' : ''
            }`}
          >
            <span>
              {`${toPrecision(
                toReadableNumber(
                  incentiveToken.decimals,
                  proposal?.incentive?.incentive_amount
                ),
                0,
                true
              )} ${toRealSymbol(
                incentiveToken.symbol
              )} divided equally among all voters`}
            </span>

            {proposal?.proposer === getCurrentWallet().wallet.getAccountId() &&
            proposal?.status !== 'Expired' ? (
              <button
                className="flex items-center justify-center rounded-2xl px-4 py-px border border-white bg-black bg-opacity-20 absolute right-7"
                onClick={() => {
                  setShowAddBonus(true);
                }}
              >
                <span className="mr-1">+</span>
                <span>
                  <FormattedMessage id="bonus" defaultMessage={'Bonus'} />
                </span>
              </button>
            ) : null}
          </div>
        ) : null}
      </Card>

      <AddBonusPopUp
        isOpen={showAddBonus}
        onRequestClose={() => {
          setShowAddBonus(false);
        }}
        title={<FormattedMessage id="add_bonus" defaultMessage={'Add Bonus'} />}
        curIncentiveToken={incentiveToken}
        proposal_id={proposal?.id}
        curIncentive={proposal?.incentive}
      />

      <VoteGovPopUp
        isOpen={showVotePop}
        title={<FormattedMessage id="you_vote" defaultMessage={'You vote'} />}
        proposalTitle={description?.title}
        onRequestClose={() => setShowVotePop(false)}
        options={data.map((d) => d.option)}
        ratios={checkAllocations(
          '100',
          data.map((d) => d.ratio)
        )}
        proposal={proposal}
        totalVE={toNonDivisibleNumber(LOVE_TOKEN_DECIMAL, totalVE)}
      />
    </div>
  );
};

const GovProposalItem = ({
  status,
  description,
  proposal,
  VEmeta,
  showDetail,
  setShowDetail,
  voteDetail,
  voteHistory,
  unClaimed,
}: {
  status: string;
  description?: Description;
  proposal: Proposal;
  VEmeta: VEMETA;
  showDetail: number;
  setShowDetail: (s: number) => void;
  voteDetail: VoteDetail;
  voteHistory: VoteDetail;
  unClaimed: boolean;
}) => {
  const StatusIcon = () => {
    return (
      <div
        className={`rounded-3xl px-2 py-1`}
        style={{
          color:
            status === 'Ended'
              ? '#73818B'
              : status === 'Live'
              ? '#A4FFEF'
              : '#BD9FFF',
          backgroundColor:
            status === 'Ended'
              ? 'rgba(0, 0, 0, 0.2)'
              : status === 'Live'
              ? 'rgba(76, 254, 222, 0.2)'
              : 'rgba(126, 69, 255, 0.2)',
        }}
      >
        {' '}
        {<FormattedMessage id={status} defaultMessage={status} />}{' '}
      </div>
    );
  };

  const base = Math.floor(
    Number(
      proposal?.status === 'InProgress' ? proposal?.end_at : proposal?.start_at
    ) / TIMESTAMP_DIVISOR
  );

  const baseCounterDown = durationFomatter(
    moment.duration(base - moment().unix(), 'seconds')
  );
  const [counterDownStirng, setCounterDownStirng] =
    useState<string>(baseCounterDown);

  useEffect(() => {
    const baseCounterDown = durationFomatter(
      moment.duration(base - moment().unix(), 'seconds')
    );
    setCounterDownStirng(baseCounterDown);
  }, [base]);

  useCounterDownVE({
    base,
    setCounterDownStirng,
    id: proposal?.id,
  });

  const voted = (voteDetail?.[proposal?.id]?.action ||
    voteHistory?.[proposal?.id]?.action) as
    | VoteAction
    | 'VoteReject'
    | 'VoteApprove';

  const incentive = proposal?.incentive;

  const { veShare } = useAccountInfo();

  const [incentiveToken, setIncentiveToken] = useState<TokenMetadata>();

  const [showAddBonus, setShowAddBonus] = useState<boolean>(false);

  const history = useHistory();

  useEffect(() => {
    if (proposal?.incentive) {
      ftGetTokenMetadata(proposal?.incentive?.incentive_token_id).then(
        setIncentiveToken
      );
    }
  }, [proposal?.incentive]);

  const [showVotePop, setShowVotePop] = useState<boolean>(false);

  if (
    typeof showDetail !== 'undefined' &&
    showDetail !== Number(proposal?.id)
  ) {
    return null;
  }

  const totalVE = scientificNotationToString(
    BigNumber.sum(
      ...(proposal?.kind?.Common
        ? proposal?.votes?.slice(0, 2)
        : proposal?.votes || [])
    ).toString()
  );

  const turnOut = new Big(totalVE)
    .div(new Big(VEmeta?.cur_total_ve_lpt || 1))
    .times(100)
    .toNumber()
    .toFixed(2);

  const options = proposal?.kind?.Common
    ? ['Yes', 'No']
    : proposal?.kind?.Poll?.options;

  const ratios = (
    proposal?.kind?.Common ? proposal?.votes?.slice(0, 2) : proposal?.votes
  )?.map((v, i) => {
    return toPrecision(
      scientificNotationToString(
        new Big(v || '0')
          .div(new Big(Number(totalVE) > 0 ? totalVE : 1))
          .times(100)
          .toString()
      ),
      2
    );
  });

  const ended = proposal?.status === 'Expired';

  const topVote = _.maxBy(
    proposal?.kind?.Common
      ? proposal?.votes?.slice(0, 2)
      : proposal?.votes || [],
    (o) => Number(o)
  );

  const topVoteIndex =
    (proposal?.kind?.Common
      ? proposal?.votes?.slice(0, 2)
      : proposal?.votes
    )?.indexOf(topVote) || 0;

  const topOption = options?.[topVoteIndex];

  return (
    <>
      {showDetail === Number(proposal?.id) ? (
        <GovItemDetail
          show={showDetail}
          setShow={setShowDetail}
          proposal={proposal}
          description={JSON.parse(
            proposal?.kind?.Poll
              ? proposal.kind.Poll.description
              : proposal.kind.Common.description
          )}
          turnOut={`${turnOut}%`}
          totalVE={toReadableNumber(LOVE_TOKEN_DECIMAL, totalVE)}
          options={options}
          voted={voted}
          incentiveToken={incentiveToken}
          veShare={veShare}
          unClaimed={unClaimed}
        />
      ) : (
        <Card
          className="w-full flex items-center my-2 relative overflow-hidden"
          bgcolor="bg-black bg-opacity-20"
          padding={`px-8 pt-8 ${proposal?.kind?.Common ? 'pb-8' : 'pb-14'}`}
        >
          <div className="w-1/5">
            {status === 'Pending' ? (
              <div className="pr-10">
                <NoResultChart />
              </div>
            ) : (
              <VoteChart
                options={options}
                ratios={checkAllocations(
                  ONLY_ZEROS.test(totalVE) ? '0' : '100',
                  ratios
                )}
              />
            )}
          </div>
          <div className="flex flex-col w-4/5 ml-8">
            <div className="w-full flex items-center  justify-between">
              <span className="text-lg break-words">
                {' '}
                {`#${proposal?.id} ${description.title}`}{' '}
              </span>

              <StatusIcon />
            </div>

            <div className="w-full flex items-center justify-between pb-8 pt-3">
              <div className="flex items-center">
                <span className="text-primaryText mr-3">
                  <FormattedMessage id="proposer" defaultMessage={'Proposer'} />
                </span>

                <span className="font-bold">
                  {getAccountName(proposal.proposer)}
                </span>
              </div>

              <span
                className={
                  status === 'Ended'
                    ? 'hidden'
                    : `${
                        status === 'Pending'
                          ? 'text-primaryText'
                          : 'text-gradientFrom'
                      }`
                }
              >
                {counterDownStirng}
                {`${proposal?.status === 'WarmUp' ? ' start' : ' left'}`}
              </span>
            </div>

            <div className="w-full flex items-center justify-between">
              <div className="flex items-center">
                <span className="flex flex-col mr-10">
                  <span className="text-primaryText">
                    <FormattedMessage
                      id="turn_out"
                      defaultMessage={'Turnout'}
                    />
                  </span>

                  <span>
                    {proposal.status === 'WarmUp' || ONLY_ZEROS.test(totalVE)
                      ? '-'
                      : `${turnOut}%`}
                  </span>
                </span>

                <span className="flex flex-col">
                  <span className="text-primaryText flex items-center ">
                    <FormattedMessage
                      id="top_answer"
                      defaultMessage={'Top Answer'}
                    />
                  </span>

                  <span className="flex items-center">
                    {proposal.status === 'WarmUp' ||
                    ONLY_ZEROS.test(totalVE) ? null : (
                      <div
                        className="w-2.5 h-2.5 rounded-sm mr-3 flex-shrink-0"
                        style={{
                          backgroundColor:
                            OPTIONS_COLORS[topVoteIndex] || '#8EA0CF',
                        }}
                      ></div>
                    )}

                    <span
                      className="truncate w-80"
                      title={
                        proposal.status === 'WarmUp' || ONLY_ZEROS.test(totalVE)
                          ? ''
                          : topOption
                      }
                    >
                      {proposal.status === 'WarmUp' || ONLY_ZEROS.test(totalVE)
                        ? '-'
                        : topOption}
                    </span>
                  </span>
                </span>
              </div>
              <div className="flex items-center">
                <BorderGradientButton
                  text={
                    <FormattedMessage id="detail" defaultMessage={'Detail'} />
                  }
                  width="h-11 w-20"
                  className="h-full"
                  padding="px-0"
                  color="#182632"
                  onClick={() => {
                    setShowDetail(proposal.id);
                    history.push(`/referendum/${proposal.id}`);
                  }}
                />

                {proposal?.status === 'Expired' && !unClaimed ? (
                  <BorderGradientButton
                    text={
                      !!voted ? (
                        <FormattedMessage id="voted" defaultMessage={'Voted'} />
                      ) : (
                        <FormattedMessage
                          id="ended_ve"
                          defaultMessage={'Ended'}
                        />
                      )
                    }
                    width="h-11 ml-2.5  w-20"
                    disabled
                    padding="px-0"
                    className="h-full"
                    color="#293540"
                  />
                ) : (
                  <NewGradientButton
                    text={
                      unClaimed ? (
                        <FormattedMessage
                          id="claim_reward"
                          defaultMessage={'Claim Reward'}
                        />
                      ) : proposal?.status === 'InProgress' && voted ? (
                        <FormattedMessage
                          id="cancel"
                          defaultMessage={'Cancel'}
                        />
                      ) : proposal?.status === 'InProgress' &&
                        ONLY_ZEROS.test(veShare) ? (
                        <FormattedMessage
                          id="no_veLPT"
                          defaultMessage={'No veLPT'}
                        />
                      ) : (
                        <FormattedMessage id="vote" defaultMessage={'Vote'} />
                      )
                    }
                    beatStyling={
                      unClaimed ||
                      (proposal?.status === 'InProgress' && !!voted)
                    }
                    className={`ml-2.5 h-11 ${unClaimed ? 'w-28' : 'w-20'}`}
                    padding="px-0 "
                    disabled={
                      (ended && !unClaimed) ||
                      proposal?.status === 'WarmUp' ||
                      (proposal?.status === 'InProgress' &&
                        ONLY_ZEROS.test(veShare))
                    }
                    onClick={() => {
                      if (unClaimed) {
                        claimRewardVE({
                          proposal_id: proposal?.id,
                        });
                      } else if (voted) {
                        cancelVote({
                          proposal_id: proposal.id,
                        });
                      } else if (proposal?.status === 'InProgress') {
                        setShowVotePop(true);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
          {proposal?.kind?.Common ? null : (
            <div
              className={`absolute w-full h-8 bg-veGradient bottom-0 right-0 flex items-center text-center justify-center text-white ${
                proposal?.status === 'Expired' ? 'opacity-30' : ''
              }`}
            >
              {proposal?.incentive && incentiveToken ? (
                <span>
                  {`${toPrecision(
                    toReadableNumber(
                      incentiveToken?.decimals,
                      proposal?.incentive?.incentive_amount
                    ),
                    2,
                    true
                  )} ${toRealSymbol(incentiveToken?.symbol)} ${
                    incentive?.incentive_type === 'Proportion'
                      ? ' divided by voting power'
                      : 'divided by voter number'
                  }  `}
                </span>
              ) : null}

              {proposal?.proposer ===
                getCurrentWallet().wallet.getAccountId() &&
              proposal?.status !== 'Expired' ? (
                <button
                  className="flex items-center justify-center rounded-2xl px-4 py-px border border-white bg-black bg-opacity-20 absolute right-7"
                  onClick={() => {
                    setShowAddBonus(true);
                  }}
                >
                  <span className="mr-1">+</span>
                  <span>
                    <FormattedMessage id="bonus" defaultMessage={'Bonus'} />
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </Card>
      )}
      <VoteGovPopUp
        isOpen={showVotePop}
        title={<FormattedMessage id="you_vote" defaultMessage={'You vote'} />}
        proposalTitle={description?.title}
        onRequestClose={() => setShowVotePop(false)}
        options={options}
        ratios={checkAllocations(
          ONLY_ZEROS.test(totalVE) ? '0' : '100',
          ratios
        )}
        proposal={proposal}
        totalVE={totalVE}
      />
      <AddBonusPopUp
        isOpen={showAddBonus}
        onRequestClose={() => {
          setShowAddBonus(false);
        }}
        title={<FormattedMessage id="add_bonus" defaultMessage={'Add Bonus'} />}
        curIncentiveToken={incentiveToken}
        proposal_id={proposal?.id}
        curIncentive={proposal?.incentive}
      />
    </>
  );
};

export const ProposalTab = ({
  className,
  curTab,
  setTab,
}: {
  className: string;
  curTab: PROPOSAL_TAB;
  setTab: (t: PROPOSAL_TAB) => void;
}) => {
  return (
    <div className={className}>
      <NewGradientButton
        className="w-72 mr-2"
        grayDisable={curTab !== PROPOSAL_TAB.FARM}
        disableForUI
        text={
          <FormattedMessage
            id="gauge_weight_vote"
            defaultMessage={'Gauge Weight Vote'}
          />
        }
        onClick={() => setTab(PROPOSAL_TAB.FARM)}
      />

      <NewGradientButton
        className="w-72 ml-2"
        onClick={() => setTab(PROPOSAL_TAB.GOV)}
        grayDisable={curTab !== PROPOSAL_TAB.GOV}
        disableForUI
        text={
          <FormattedMessage id="governance" defaultMessage={'Governance'} />
        }
      />
    </div>
  );
};

export const VoteGovPopUp = (
  props: Modal.Props & {
    title: JSX.Element | string;
    proposalTitle: string;
    options: string[];
    ratios: string[];
    proposal: Proposal;
    totalVE: string;
  }
) => {
  const { title, proposalTitle, ratios, proposal, options, totalVE } = props;

  const [value, setvalue] = useState<string>();

  const CheckComponent = ({ checked }: { checked: boolean }) => {
    return (
      <div
        className={`rounded-full w-4 h-4 flex items-center justify-center `}
        style={{
          backgroundColor: checked ? '#00846C' : '#304452',
        }}
      >
        <div
          className={`rounded-full w-1.5 h-1.5 ${
            checked ? '' : 'opacity-30'
          } bg-white`}
        ></div>
      </div>
    );
  };

  const { veShare } = useAccountInfo();

  const newPercent = new Big(toNonDivisibleNumber(LOVE_TOKEN_DECIMAL, veShare))
    .plus(
      options.indexOf(value) !== -1
        ? new Big(
            proposal?.votes[
              proposal?.kind?.Common
                ? value === 'Yes'
                  ? 0
                  : 1
                : proposal?.kind?.Poll?.options.indexOf(value)
            ] || 0
          )
        : 0
    )
    .div(
      new Big(Number(totalVE) > 0 ? totalVE : 0).plus(
        Number(veShare) > 0
          ? toNonDivisibleNumber(LOVE_TOKEN_DECIMAL, veShare)
          : '1'
      )
    )
    .times(100);

  return (
    <ModalWrapper {...props}>
      <div className="pt-6 pb-8">
        <div className="pb-4">{proposalTitle}</div>

        <div className="pt-6 px-5 pr-6 rounded-lg bg-black bg-opacity-20">
          {options?.map((o, i) => {
            return (
              <button
                className="flex items-center justify-between pb-7 w-full"
                onClick={() => {
                  setvalue(o);
                }}
              >
                <span className="flex items-center ">
                  <CheckComponent checked={value === o} />

                  <span className="ml-4 truncate w-56 text-left" title={o}>
                    {o}
                  </span>
                </span>

                <span className="flex items-center">
                  {value === o ? (
                    <span className="mr-2.5 text-gradientFrom">
                      +
                      {toPrecision(
                        scientificNotationToString(
                          newPercent.minus(ratios[i] || 0).toString()
                        ),
                        2
                      )}
                      %
                    </span>
                  ) : null}

                  <span>{ratios[i]}%</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center w-full">
        <NewGradientButton
          text={<FormattedMessage id="confirm" defaultMessage={'Confirm'} />}
          className="w-full h-10 mx-2"
          padding="py-2.5"
          disabled={!value}
          onClick={() => {
            proposal?.kind?.Common
              ? VoteCommon({
                  proposal_id: proposal?.id,
                  action: value === 'Yes' ? 'VoteApprove' : 'VoteReject',
                })
              : VotePoll({
                  proposal_id: proposal?.id,
                  index: proposal?.kind?.Poll?.options.indexOf(value),
                });
          }}
          beatStyling
        />
      </div>
    </ModalWrapper>
  );
};

export const LastRoundFarmVoting = (
  props: Modal.Props & {
    title: string | JSX.Element;
    proposal: Proposal;
    VEmeta: VEMETA & {
      totalVE: string;
    };
  }
) => {
  const { proposal: farmProposal, VEmeta } = props;

  const voteDetail = useVoteDetail();

  const voteHistoryDetail = useVoteDetailHisroty();

  const votedVE = BigNumber.sum(...(farmProposal?.votes || ['0', '0']));

  const [tokens, setTokens] = useState<Record<string, TokenMetadata>>();

  useEffect(() => {
    ftGetTokensMetadata(
      farmProposal?.kind?.FarmingReward?.farm_list
        ?.map((pair) => {
          return pair.split(PAIR_SEPERATOR);
        })
        .flat() || []
    ).then(setTokens);
  }, [farmProposal]);

  const displayRatios = votedVE.isGreaterThan(0)
    ? farmProposal?.votes.map((vote) =>
        new BigNumber(vote).div(votedVE).times(100).toFixed(2)
      )
    : farmProposal?.kind?.FarmingReward?.farm_list?.map((_, i) => '0');

  const checkedRatios = checkAllocations('100', displayRatios);

  const displayVELPT = farmProposal?.votes.map((vote) =>
    toPrecision(toReadableNumber(LOVE_TOKEN_DECIMAL, vote), 2, false)
  );

  const checkedVELPTs = checkAllocations(
    toPrecision(
      toReadableNumber(
        LOVE_TOKEN_DECIMAL,
        scientificNotationToString(votedVE.toString())
      ),
      2
    ),
    displayVELPT
  );

  const allocations = checkAllocations('100', displayRatios).map((r) => {
    return toPrecision(
      multiply(
        divide(r, '100').toString(),
        farmProposal?.kind?.FarmingReward?.total_reward.toString()
      ),
      0
    );
  });

  const checkedAllocations = checkAllocations(
    farmProposal?.kind?.FarmingReward?.total_reward.toString(),
    allocations
  );
  const supplyPercent = votedVE
    .dividedBy(toNonDivisibleNumber(LOVE_TOKEN_DECIMAL, VEmeta.totalVE || '1'))
    .times(100)
    .toNumber()
    .toFixed(2);
  const InfoRow = ({
    title,
    value,
    valueTitle,
  }: {
    title: string | JSX.Element;
    value: string;
    valueTitle?: string;
  }) => {
    return (
      <div className="my-2 text-sm whitespace-nowrap text-farmText flex items-center justify-between w-full">
        <span>{title}</span>
        <div className="mx-1 border border-b border-dashed border-white border-opacity-10 w-full"></div>

        <span className="text-white whitespace-nowrap" title={valueTitle}>
          {value}
        </span>
      </div>
    );
  };

  return (
    <ModalWrapper {...props} customWidth="650px">
      <FarmChart
        ratio={farmProposal?.kind?.FarmingReward?.farm_list?.map((f, i) => ({
          name: f,
          value: Number(farmProposal.votes[i]),
          pairSymbol: f
            .split(PAIR_SEPERATOR)
            .map((id) => toRealSymbol(tokens?.[id]?.symbol || ''))
            .join('/'),
          tokens: f.split(PAIR_SEPERATOR).map((id) => tokens?.[id]),

          r: checkedRatios[i] + '%',
          allocation: toPrecision(checkedAllocations[i] || '0', 0, true),
          veLPT: checkedVELPTs[i] || '0',
        }))}
        size={farmProposal?.kind?.FarmingReward?.farm_list?.length}
        voted={
          voteDetail?.[farmProposal?.id]?.action?.VoteFarm?.farm_id ||
          voteHistoryDetail?.[farmProposal?.id]?.action?.VoteFarm?.farm_id
        }
        outerRadiusProp={130}
        innerRadiusProp={100}
        forLastRound
      />

      <div className="w-full border-b border-white border-opacity-10 mb-4"></div>

      <InfoRow
        title={
          <FormattedMessage
            id="Voting Apply Period"
            defaultMessage={'Voting Apply Period'}
          />
        }
        value={`
          ${moment(
            Math.floor(Number(farmProposal.start_at) / TIMESTAMP_DIVISOR) * 1000
          ).format('D')}-${moment(
          Math.floor(Number(farmProposal.end_at) / TIMESTAMP_DIVISOR) * 1000
        ).format('D')}
          ${moment(
            Math.floor(Number(farmProposal.end_at) / TIMESTAMP_DIVISOR) * 1000
          ).format('MMMM')},
          ${moment(
            Math.floor(Number(farmProposal.end_at) / TIMESTAMP_DIVISOR) * 1000
          ).year()}

          `}
      />
      <InfoRow
        title={
          <span className="flex items-center">
            <FormattedMessage
              id="voting_gauge_share"
              defaultMessage={'Voting Gauge Share'}
            />
            <span className="ml-1">
              <QuestionTip id="voting_gauge_share_tip" />
            </span>
          </span>
        }
        value={'10%'}
      />
      <InfoRow
        title={
          <FormattedMessage
            id="ref_allocation"
            defaultMessage={'REF Allocation'}
          />
        }
        value={`${toPrecision(
          farmProposal?.kind?.FarmingReward.total_reward.toString() || '0',
          0,
          true
        )} REF`}
      />
      <InfoRow
        title={
          <FormattedMessage
            id="designatated_pools"
            defaultMessage={'Designated Pools'}
          />
        }
        value={farmProposal?.kind?.FarmingReward.farm_list.length.toString()}
      />
      <InfoRow
        title={
          <FormattedMessage
            id="voted"
            defaultMessage={'Voted'}
          ></FormattedMessage>
        }
        value={`${toPrecision(
          toReadableNumber(
            18,
            scientificNotationToString(
              BigNumber.sum(...(farmProposal?.votes || ['0', '0'])).toString()
            )
          ),
          2,
          true
        )} veLPT`}
      />
      <InfoRow
        title={
          <FormattedMessage
            id="total"
            defaultMessage={'Total'}
          ></FormattedMessage>
        }
        value={`${
          Number(VEmeta.totalVE) === 0
            ? '0'
            : toPrecision(VEmeta.totalVE, 2, true, false)
        } veLPT`}
      />
      <InfoRow
        title={
          <FormattedMessage id="supply_voted" defaultMessage={'Supply Voted'} />
        }
        value={`${Number(supplyPercent) === 0 ? 0 : supplyPercent}%`}
      />
    </ModalWrapper>
  );
};

export const FarmProposal = ({
  farmProposal,
  lastRoundFarmProposal,
}: {
  farmProposal: Proposal;
  lastRoundFarmProposal: Proposal;
}) => {
  const base = Math.floor(
    Number(
      farmProposal?.status === 'InProgress'
        ? farmProposal?.end_at
        : farmProposal?.start_at
    ) / TIMESTAMP_DIVISOR
  );

  const baseCounterDown = durationFomatter(
    moment.duration(base - moment().unix(), 'seconds')
  );
  const [counterDownStirng, setCounterDownStirng] =
    useState<string>(baseCounterDown);

  useCounterDownVE({
    base,
    setCounterDownStirng,
    id: farmProposal?.id,
  });

  const [showLastRoundVoting, setShowLastRoundVoting] =
    useState<boolean>(false);

  const VEmeta = useVEmeta();

  const voteDetail = useVoteDetail();
  const voteHistoryDetail = useVoteDetailHisroty();

  const { veShare, veShareRaw } = useAccountInfo();

  const startTime = Math.floor(
    new Big(farmProposal?.start_at || 0).div(TIMESTAMP_DIVISOR).toNumber()
  );

  const endTime = Math.floor(
    new Big(farmProposal?.end_at || 0).div(TIMESTAMP_DIVISOR).toNumber()
  );

  const ended = moment().unix() > endTime;

  const isPending = moment().unix() < startTime;

  const InfoCard = ({
    titles,
    values,
    className,
  }: {
    titles: (JSX.Element | string)[];
    values: (string | number)[];
    className?: string;
  }) => {
    return (
      <div
        className={`${className} bg-black bg-opacity-20 rounded-2xl px-6 flex flex-col`}
      >
        {titles.map((t, i) => {
          return (
            <div className="flex items-center justify-between py-3">
              <span>{t}</span>
              <span className="text-white">{values[i]}</span>
            </div>
          );
        })}
      </div>
    );
  };
  const votedVE = BigNumber.sum(...(farmProposal?.votes || ['0', '0']));

  const [tokens, setTokens] = useState<Record<string, TokenMetadata>>();

  useEffect(() => {
    ftGetTokensMetadata(
      farmProposal?.kind?.FarmingReward?.farm_list
        ?.map((pair) => {
          return pair.split(PAIR_SEPERATOR);
        })
        .flat() || []
    ).then(setTokens);
  }, [farmProposal]);

  const displayRatios = votedVE.isGreaterThan(0)
    ? farmProposal?.votes.map((vote) =>
        new BigNumber(vote).div(votedVE).times(100).toFixed(2)
      )
    : farmProposal?.kind?.FarmingReward?.farm_list?.map((_, i) => '0');

  const checkedRatios = checkAllocations('100', displayRatios);

  const displayVELPT = farmProposal?.votes.map((vote) =>
    toPrecision(toReadableNumber(LOVE_TOKEN_DECIMAL, vote), 2, false)
  );

  const checkedVELPTs = checkAllocations(
    toPrecision(
      toReadableNumber(
        LOVE_TOKEN_DECIMAL,
        scientificNotationToString(votedVE.toString())
      ),
      2
    ),
    displayVELPT
  );

  const allocations = checkAllocations('100', displayRatios).map((r) => {
    return toPrecision(
      multiply(
        divide(r, '100').toString(),
        farmProposal?.kind?.FarmingReward?.total_reward.toString()
      ),
      0
    );
  });

  const checkedAllocations = checkAllocations(
    farmProposal?.kind?.FarmingReward?.total_reward.toString(),
    allocations
  );

  const FarmLine = ({
    className,
    voted,
    index,
    tokens,
    veLPT,
    allocate,
    ratio,
  }: {
    className?: string;
    voted: number;
    index: number;
    tokens: TokenMetadata[];
    veLPT: string;
    allocate: string;
    ratio: string;
  }) => {
    const [votePopUpOpen, setVotePopUpOpen] = useState<boolean>(false);

    const [hover, setHover] = useState<boolean>(false);
    const submit = (e: Event) => {
      setHover(false);
      ended || isPending
        ? e.stopPropagation()
        : voted === index
        ? cancelVote({ proposal_id: farmProposal.id })
        : voted === undefined && !ONLY_ZEROS.test(veShare)
        ? setVotePopUpOpen(true)
        : e.stopPropagation();
    };
    const text = ended ? (
      <FormattedMessage id="ended_ve" defaultMessage={'Ended'} />
    ) : ONLY_ZEROS.test(veShare) && !isPending ? (
      <FormattedMessage id="no_veLPT" defaultMessage={'No veLPT'} />
    ) : voted === index ? (
      <FormattedMessage id="cancel" defaultMessage={'Cancel'} />
    ) : (
      <FormattedMessage id="vote" defaultMessage={'Vote'} />
    );

    const ratioNew = scientificNotationToString(
      new BigNumber(farmProposal?.votes[index])
        .plus(new BigNumber(veShareRaw))
        .div(votedVE.plus(veShareRaw))
        .times(100)
        .toString()
    );

    const allocateNew = multiply(
      divide(ratioNew, '100').toString(),
      farmProposal?.kind?.FarmingReward?.total_reward.toString()
    );

    return (
      <>
        <div
          className={`py-5 grid grid-cols-7 rounded-lg items-center ${
            hover ? 'bg-cardBg bg-opacity-50' : ''
          } text-white`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onTouchStart={() => setHover(true)}
        >
          <span className="col-span-3 pl-4 flex items-center">
            <Images tokens={tokens} size={'9'} />
            <span className="pr-2.5"></span>
            <Symbols tokens={tokens} seperator={'-'} />

            {voted === index ? (
              <NewGradientButton
                className="ml-2 text-white text-sm px-2.5 py-1.5 cursor-default"
                text={
                  <FormattedMessage
                    id="you_voted"
                    defaultMessage={'You voted'}
                  />
                }
              />
            ) : null}
          </span>
          <span className="col-span-1 text-center">
            {toPrecision(veLPT, 2, true)}
          </span>
          <span className="col-span-1 text-center">{ratio}%</span>
          <span className="col-span-1 text-center">
            {toPrecision(allocate, 0, true)}
          </span>
          <span className="col-span-1 text-center text-white text-sm">
            {hover || voted === index ? (
              <NewGradientButton
                onClick={submit}
                text={text}
                className="h-10 w-20"
                padding="px-0 py-2.5"
                beatStyling={voted === index}
                disabled={
                  ended ||
                  isPending ||
                  (voted !== undefined && voted !== index) ||
                  ONLY_ZEROS.test(veShare)
                }
              />
            ) : (
              <BorderGradientButton
                onClick={submit}
                text={text}
                width="w-20 h-10"
                opacity={'opacity-30'}
                className={`py-1 h-full`}
                padding={'px-0 py-2.5'}
                color="#182632"
              />
            )}
          </span>
        </div>
        <VotePopUp
          isOpen={votePopUpOpen}
          onRequestClose={() => setVotePopUpOpen(false)}
          proposal_id={farmProposal.id}
          index={index}
          tokens={tokens}
          votedThisFarm={toPrecision(
            toReadableNumber(LOVE_TOKEN_DECIMAL, farmProposal?.votes[index]),
            2,
            true
          )}
          myPower={toPrecision(veShare, 2, true)}
          ratioOld={`${toPrecision(
            scientificNotationToString(ratio.toString()),
            2,
            false
          )}%`}
          allocationOld={toPrecision(allocate, 0, true)}
          ratioNew={`${toPrecision(ratioNew, 1, false)}%`}
          allocationNew={toPrecision(allocateNew, 0, true)}
          curVotedVe={toPrecision(
            toReadableNumber(LOVE_TOKEN_DECIMAL, farmProposal?.votes[index]),
            2,
            true
          )}
        />
      </>
    );
  };

  const supplyPercent = votedVE
    .dividedBy(toNonDivisibleNumber(LOVE_TOKEN_DECIMAL, VEmeta.totalVE || '1'))
    .times(100)
    .toNumber()
    .toFixed(2);

  const endtimeMoment = moment(
    Math.floor(Number(farmProposal.end_at) / TIMESTAMP_DIVISOR) * 1000
  );

  return (
    <div className="flex flex-col items-center">
      <div className="text-center text-2xl text-white">
        <FormattedMessage id="proposed" defaultMessage={'Proposed'} />{' '}
        <span>
          {endtimeMoment.date() > 15
            ? 'First Half of ' + endtimeMoment.add(1, 'M').format('MMMM')
            : 'Second Half of ' + endtimeMoment.format('MMMM')}
        </span>{' '}
        <span>
          {endtimeMoment.date() > 15
            ? endtimeMoment.add(1, 'M').year()
            : endtimeMoment.year()}
        </span>{' '}
        <FormattedMessage id="farm_reward" defaultMessage={'Farm reward'} />
      </div>

      <div className="text-center relative text-sm mt-4 w-full">
        <span>Voting period</span> <span></span>{' '}
        {moment(
          Math.floor(Number(farmProposal.start_at) / TIMESTAMP_DIVISOR) * 1000
        ).format('D')}
        -
        {moment(
          Math.floor(Number(farmProposal.end_at) / TIMESTAMP_DIVISOR) * 1000
        ).format('D')}{' '}
        {moment(
          Math.floor(Number(farmProposal.end_at) / TIMESTAMP_DIVISOR) * 1000
        ).format('MMMM')}
        {', '}
        {moment(
          Math.floor(Number(farmProposal.end_at) / TIMESTAMP_DIVISOR) * 1000
        ).year()}
        <span className="rounded-3xl bg-black bg-opacity-20 py-1.5 text-xs pr-4 pl-2 text-gradientFrom absolute right-0">
          {ended ? (
            <span className="text-primaryText ml-2">
              <FormattedMessage id={'ended_ve'} defaultMessage="Ended" />
            </span>
          ) : (
            <div className="flex items-center">
              <span
                className={`rounded-3xl px-2 py-0.5 mr-2  ${
                  farmProposal?.status === 'WarmUp'
                    ? 'text-white bg-pendingPurple'
                    : 'text-black bg-gradientFrom'
                }`}
              >
                {farmProposal?.status === 'InProgress' ? (
                  <FormattedMessage id="live" defaultMessage={'Live'} />
                ) : (
                  <FormattedMessage id="pending" defaultMessage={'Pending'} />
                )}
              </span>
              <span>{counterDownStirng}</span>
            </div>
          )}
        </span>
      </div>

      <div className="flex mt-10 w-full mb-10">
        <InfoCard
          className="text-sm mr-2 w-full"
          titles={[
            <span className="flex items-center">
              <FormattedMessage
                id="voting_gauge_share"
                defaultMessage={'Voting Gauge Share'}
              />
              <span className="ml-1">
                <QuestionTip id="voting_gauge_share_tip" />
              </span>
            </span>,
            <FormattedMessage
              id="ref_allocation"
              defaultMessage={'REF Allocation'}
            />,
            <FormattedMessage
              id="designatated_pools"
              defaultMessage={'Designated Pools'}
            />,
          ]}
          values={[
            '10%',
            `${toPrecision(
              farmProposal?.kind?.FarmingReward.total_reward.toString() || '0',
              0,
              true
            )} REF`,
            farmProposal?.kind?.FarmingReward.farm_list.length,
          ]}
        />

        <InfoCard
          className="text-sm ml-2 w-full"
          titles={[
            <FormattedMessage id="voted" defaultMessage={'Voted'} />,
            <FormattedMessage id="total" defaultMessage={'Total'} />,
            <FormattedMessage
              id="supply_voted"
              defaultMessage={'Supply Voted'}
            />,
          ]}
          values={[
            `${toPrecision(
              toReadableNumber(
                18,
                scientificNotationToString(
                  BigNumber.sum(
                    ...(farmProposal?.votes || ['0', '0'])
                  ).toString()
                )
              ),
              2,
              true
            )} veLPT`,
            `${
              Number(VEmeta.totalVE) === 0
                ? '0'
                : toPrecision(VEmeta.totalVE, 2, true, false)
            } veLPT`,
            `${Number(supplyPercent) === 0 ? 0 : supplyPercent}%`,
          ]}
        />
      </div>
      {!lastRoundFarmProposal ? null : (
        <BorderGradientButton
          text={
            <FormattedMessage
              id="check_last_round"
              defaultMessage={'Check Last Round'}
            />
          }
          className="text-white text-sm  w-full h-full"
          padding=" py-2"
          width="w-36 h-12 relative self-start"
          color="#192431"
          onClick={() => {
            setShowLastRoundVoting(true);
          }}
        />
      )}

      <FarmChart
        ratio={farmProposal?.kind?.FarmingReward?.farm_list?.map((f, i) => ({
          name: f,
          value: Number(farmProposal.votes[i]),
          pairSymbol: f
            .split(PAIR_SEPERATOR)
            .map((id) => toRealSymbol(tokens?.[id]?.symbol || ''))
            .join('/'),
          tokens: f.split(PAIR_SEPERATOR).map((id) => tokens?.[id]),

          r: checkedRatios[i] + '%',
          allocation: toPrecision(checkedAllocations[i] || '0', 0, true),
          veLPT: checkedVELPTs[i] || '0',
        }))}
        size={farmProposal?.kind?.FarmingReward?.farm_list?.length}
        voted={
          voteDetail?.[farmProposal?.id]?.action?.VoteFarm?.farm_id ||
          voteHistoryDetail?.[farmProposal?.id]?.action?.VoteFarm?.farm_id
        }
      />

      <Card
        className="w-full"
        bgcolor="bg-black bg-opacity-20"
        padding={'px-2 pt-8 pb-4'}
      >
        <div className="grid grid-cols-7 pb-4">
          <span className="col-span-3 pl-4">
            <FormattedMessage id="farms" defaultMessage={'Farms'} />
          </span>
          <span className="col-span-1 text-center">veLPT</span>
          <span className="col-span-1 text-center">
            <FormattedMessage id="ratio" defaultMessage={'Ratio'} />
          </span>
          <span className="col-span-1 text-center">
            <FormattedMessage
              id="ref_allocation"
              defaultMessage={'REF allocation'}
            />
          </span>
          <span className="col-span-1 text-center">
            <FormattedMessage id="vote" defaultMessage={'Vote'} />
          </span>
        </div>

        {farmProposal?.kind?.FarmingReward?.farm_list?.map(
          (pair: string, id) => {
            return (
              <FarmLine
                index={id}
                key={id}
                tokens={pair.split(PAIR_SEPERATOR).map((id) => tokens?.[id])}
                voted={
                  voteDetail?.[farmProposal?.id]?.action?.VoteFarm?.farm_id ||
                  voteHistoryDetail?.[farmProposal?.id]?.action?.VoteFarm
                    ?.farm_id
                }
                ratio={checkedRatios[id]}
                veLPT={checkedVELPTs[id]}
                allocate={checkedAllocations[id]}
              />
            );
          }
        )}
      </Card>
      {!lastRoundFarmProposal ? null : (
        <LastRoundFarmVoting
          isOpen={showLastRoundVoting}
          onRequestClose={() => {
            setShowLastRoundVoting(false);
          }}
          title={
            <FormattedMessage
              id="last_round_voting_result"
              defaultMessage={'Last Round Voting Result'}
            />
          }
          proposal={lastRoundFarmProposal}
          VEmeta={VEmeta}
        />
      )}
    </div>
  );
};

export const CreateGovProposal = ({
  show,
  setShow,
  index,
  config,
}: {
  show: boolean;
  setShow: (s: boolean) => void;
  index: number;
  config: VEConfig;
}) => {
  const [title, setTitle] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  const intl = useIntl();

  const [type, setType] = useState<string>('Poll');

  const [options, setOptions] = useState<string[]>([]);

  const [link, setLink] = useState<string>();

  const baseStartTime = addSeconds(
    (config?.min_proposal_start_vote_offset_sec || 0) + 3600
  );

  const [startTime, setStartTime] = useState<Date>(baseStartTime);

  const [endTime, setEndTime] = useState<Date>(
    new Date(baseStartTime.getTime() + 3600 * 24 * 7 * 1000)
  );

  const [openPickerStart, setOpenPickerStart] = useState<boolean>(false);
  const [openPickerEnd, setOpenPickerEnd] = useState<boolean>(false);

  const [require, setRequire] = useState<{
    [pos: string]: string;
  }>();

  useEffect(() => {
    if (startTime < endTime) {
      setRequire({
        ...require,
        time: '',
      });
    }
  }, [startTime, endTime]);

  const typeList = ['Poll', 'Yes/No'];

  useEffect(() => {
    if (type === 'Yes/No') {
      setOptions(['Yes', 'No']);
    } else {
      setOptions(['']);
    }
  }, [type]);

  const isClientMobie = useClientMobile();

  const [beating, setBeating] = useState<boolean>(false);

  const [focuesIndex, setFocusedIndex] = useState<number>(-1);

  const validate = () => {
    let newRequire = { ...require };

    if (dateToUnixTimeSec(endTime) - dateToUnixTimeSec(startTime) <= 0) {
      newRequire = {
        ...newRequire,
        time: intl.formatMessage({
          defaultMessage: 'Start time must be before end time',
          id: 'start_time_should_be_earlier_than_end_time',
        }),
      };
    }

    if (!link?.trim()) {
      newRequire = {
        ...newRequire,
        link: intl.formatMessage({
          defaultMessage: 'Required field',
          id: 'required_field',
        }),
      };
    }
    if (!title?.trim()) {
      newRequire = {
        ...newRequire,
        title: intl.formatMessage({
          defaultMessage: 'Required field',
          id: 'required_field',
        }),
      };
    }

    if (options.filter((_) => !!_.trim()).length < 2) {
      newRequire = {
        ...newRequire,
        option: intl.formatMessage({
          defaultMessage: 'Required field',
          id: 'required_field',
        }),
      };
    }

    if (
      dateToUnixTimeSec(endTime) - dateToUnixTimeSec(startTime) <= 0 ||
      !link?.trim() ||
      !title?.trim() ||
      options.filter((_) => !!_.trim()).length < 2
    ) {
      setRequire(newRequire);

      return false;
    }

    setBeating(true);
    return true;
  };

  return !show ? null : (
    <div className="text-white">
      <div className="text-center relative text-xl pb-7">
        <FormattedMessage
          id="create_a_proposal"
          defaultMessage={'Create A Proposal'}
        />

        <button
          className="absolute left-0 top-2 text-sm text-primaryText flex items-center"
          onClick={() => setShow(false)}
        >
          <span className="transform scale-50">
            {<LeftArrowVE stroke="#7E8A93" strokeWidth={2} />}
          </span>
          <span className="ml-1">
            <FormattedMessage id="back" defaultMessage={'Back'} />
          </span>
        </button>
      </div>

      <Card
        className="w-full"
        bgcolor="bg-black bg-opacity-20 "
        padding={'px-6 py-9'}
      >
        <div
          className={`pb-3 border-b ${
            require?.['title']
              ? 'border-error'
              : 'border-white border-opacity-10'
          }  px-2 pt-8 text-primaryText text-xl`}
        >
          <input
            value={title}
            maxLength={100}
            placeholder={intl.formatMessage({
              id: 'proposal_title',
              defaultMessage: 'Proposal Title',
            })}
            onChange={(e) => {
              if (e.target.value) {
                setRequire({
                  ...require,
                  title: '',
                });
              }
              setTitle(e.target.value);
            }}
          />
        </div>

        <div
          className={`mx-2 pt-2 text-error text-sm ${
            require?.['title'] ? 'block' : 'hidden'
          } `}
        >
          {`${require?.['title']} !`}{' '}
        </div>

        <div className="text-xs text-primaryText text-right pt-2.5">
          {title?.length || 0}/100
        </div>

        <div className="flex items-center">
          <span>
            <FormattedMessage id="type" defaultMessage={'Type'} />
          </span>

          <SelectUI
            curvalue={type}
            list={typeList}
            onChange={setType}
            size={'text-sm'}
            className={'ml-2'}
            canSelect
          />
        </div>

        <div className={`flex items-center flex-wrap pt-2 pb-10`}>
          {options?.map((o, i) => {
            return (
              <>
                {type === 'Poll' ? (
                  <span
                    className={`flex items-center pr-1 py-1 pl-2 w-28 mt-2 relative ${
                      require?.['option'] && !o.trim() && i < 2
                        ? 'border border-error border-opacity-30'
                        : ''
                    }  bg-black ${
                      focuesIndex === i ? 'bg-opacity-20' : 'bg-opacity-10'
                    } text-sm mr-4 rounded-md `}
                  >
                    <span
                      className="rounded-full mr-2 h-2 w-2 flex-shrink-0"
                      style={{
                        backgroundColor:
                          OPTIONS_COLORS[i % OPTIONS_COLORS.length],
                      }}
                    ></span>

                    <input
                      value={o}
                      onFocus={() => {
                        setFocusedIndex(i);
                      }}
                      onChange={(e) => {
                        setOptions([]);

                        setOptions([
                          ...options.slice(0, i),
                          e.target.value,
                          ...options.slice(i + 1, options.length),
                        ]);
                        e.target.focus();
                        setRequire({
                          ...require,
                          option: '',
                        });
                      }}
                    />

                    <button
                      className={`rounded-md text-lg bg-opacity-20 px-2.5 w-5 h-5 flex items-center justify-center ${
                        focuesIndex === i ? 'flex' : 'hidden'
                      } `}
                      onClick={() => {
                        if (options.length > 1) {
                          setOptions(
                            options
                              .slice(0, i)
                              .concat(options.slice(i + 1, options.length))
                          );
                        }
                      }}
                      style={{
                        backgroundColor: '#445867',
                      }}
                    >
                      <span>-</span>
                    </button>
                    {require?.['option'] && !o.trim() && i < 2 ? (
                      <div
                        className={`mx-2 whitespace-nowrap top-10 absolute text-error text-sm  `}
                      >
                        {`${require?.['option']} !`}{' '}
                      </div>
                    ) : null}
                  </span>
                ) : (
                  <div
                    className={`flex items-center rounded-md w-28 bg-opacity-10 bg-black text-sm pl-2 pr-1 py-1 mr-4 mt-2`}
                  >
                    <span
                      className="rounded-full mr-2 h-2 w-2"
                      style={{
                        backgroundColor:
                          OPTIONS_COLORS[i % OPTIONS_COLORS.length],
                      }}
                    ></span>

                    <span className="">{o}</span>
                  </div>
                )}
              </>
            );
          })}

          {type === 'Yes/No' ? null : (
            <>
              <button
                className=" rounded-lg text-lg bg-black bg-opacity-20 px-2.5 text-primaryText mt-2"
                onClick={(e) => {
                  if (options[options.length - 1]) {
                    setOptions([...options, '']);
                  }
                }}
              >
                +
              </button>
            </>
          )}
        </div>

        <div className="pb-4">
          <FormattedMessage
            id="voting_period"
            defaultMessage={'Voting Period'}
          />
          (UTC)
        </div>

        <div className="flex items-center">
          <div className="rounded-lg bg-black bg-opacity-20 py-2 px-3 flex items-center justify-between w-60 cursor-pointer">
            <CustomDatePicker
              startTime={startTime}
              setStartTime={setStartTime}
              setEndTime={setEndTime}
              endTime={endTime}
              openPicker={openPickerStart}
              setOpenPicker={setOpenPickerStart}
              veconfig={config}
            />
            <div
              onClick={(e) => {
                e.stopPropagation();

                setOpenPickerStart(!openPickerStart);
              }}
            >
              <CalenderIcon />
            </div>
          </div>{' '}
          <span className="mx-4">-</span>
          <div className="rounded-lg bg-black bg-opacity-20 py-2 px-3 flex items-center justify-between w-60 cursor-pointer">
            <CustomDatePicker
              startTime={startTime}
              setStartTime={setStartTime}
              endTime={endTime}
              setEndTime={setEndTime}
              forEnd
              openPicker={openPickerEnd}
              setOpenPicker={setOpenPickerEnd}
              veconfig={config}
            />
            <div
              onClick={(e) => {
                e.stopPropagation();

                setOpenPickerEnd(!openPickerEnd);
              }}
            >
              <CalenderIcon />
            </div>
          </div>
        </div>

        <div
          className={`mx-2 pt-2 text-error text-sm ${
            require?.['time'] ? 'block' : 'hidden'
          } `}
        >
          {`${require?.['time']} !`}{' '}
        </div>

        <div className="pb-4 pt-10">
          <FormattedMessage
            id="forum_discussion"
            defaultMessage={'Forum Discussion'}
          />
        </div>
        <div className='border-b border-white border-opacity-10 pb-6 mb-6"'>
          <div
            className={`w-full ${
              require?.['link'] ? 'border border-error border-opacity-30' : ''
            } text-sm text-primaryText px-5 bg-black bg-opacity-20 py-2 flex items-center rounded-lg `}
          >
            <span className="text-white mr-3">↗</span>

            <input
              value={link}
              onChange={(e) => {
                if (e.target.value) {
                  setRequire({
                    ...require,
                    link: '',
                  });
                }
                setLink(e.target.value);
              }}
              placeholder={intl.formatMessage({
                id: 'share_forum_discussion_link_here',
                defaultMessage: 'Share forum discussion link here',
              })}
              className="w-full"
            />
          </div>

          <div
            className={`mx-2 pt-2 text-error text-sm ${
              require?.['link'] ? 'block' : 'hidden'
            } `}
          >
            {`${require?.['link']} !`}{' '}
          </div>
        </div>

        <div className="flex items-center justify-end pt-6">
          <BorderGradientButton
            text={<FormattedMessage id="preview" defaultMessage={'Preview'} />}
            color={'#192734'}
            onClick={() => setShowPreview(true)}
          />

          <NewGradientButton
            text={<FormattedMessage id="create" defaultMessage={'Create'} />}
            onClick={() => {
              if (validate()) {
                createProposal({
                  description: {
                    title: `${title}`,
                    link,
                  },
                  kind: type === 'Poll' ? 'Poll' : 'Common',
                  options,
                  duration_sec:
                    dateToUnixTimeSec(endTime) - dateToUnixTimeSec(startTime),
                  start: dateToUnixTimeSec(startTime),
                });
              }
            }}
            disabled={
              dateToUnixTimeSec(endTime) - dateToUnixTimeSec(startTime) <= 0 ||
              !link?.trim() ||
              !title?.trim() ||
              options.filter((_) => !!_.trim()).length < 2
            }
            beatStyling={beating}
            className="ml-4"
            disableForUI
          />
        </div>
      </Card>

      <PreviewPopUp
        isOpen={showPreview}
        onRequestClose={() => setShowPreview(false)}
        index={index}
        title={
          <FormattedMessage
            id="preview_your_proposal"
            defaultMessage={'Preview your proposal'}
          />
        }
        startTime={startTime}
        endTime={endTime}
        setStartTime={setStartTime}
        setEndTime={setEndTime}
        contentTitle={title}
        customWidth={isClientMobie ? '95%' : '1000px'}
        link={link}
        show={showPreview}
        setShow={setShowPreview}
        options={options.slice(
          0,
          !!options[options.length - 1] ? options.length : options.length - 1
        )}
        turnOut={'0.00%'}
        totalVE={'0'}
        type={type}
      />
    </div>
  );
};

export const GovProposal = ({
  proposals,
  setShowCreateProposal,
  showDetail,
  setShowDetail,
}: {
  proposals: Proposal[];
  setShowCreateProposal: (s: boolean) => void;
  showDetail: number;
  setShowDetail: (s: number) => void;
}) => {
  const VotedOnlyKey = 'REF_FI_GOV_PROPOSAL_VOTED_ONLY';

  const { globalState } = useContext(WalletContext);

  const isSignedIn = globalState.isSignedIn;

  const [votedOnly, setVotedOnly] = useState<boolean>(
    (isSignedIn && localStorage.getItem(VotedOnlyKey)?.toString() === '1') ||
      false
  );

  const VEmeta = useVEmeta();

  const unClaimedRewards = useUnClaimedRewardsVE();

  const voteHistory = useVoteDetailHisroty();

  const voteDetail = useVoteDetail();

  const [state, setState] = useState<'All' | 'Live' | 'Ended' | 'Pending'>(
    'All'
  );

  const UnclaimedProposal = useUnclaimedProposal();

  const proposalStatus = {
    InProgress: 'Live',
    Expired: 'Ended',
    WarmUp: 'Pending',
  };

  return (
    <div className="flex flex-col text-white text-sm relative">
      {!unClaimedRewards ||
      unClaimedRewards?.length === 0 ||
      showDetail ? null : (
        <RewardCard rewardList={unClaimedRewards} />
      )}

      {showDetail ? null : (
        <div
          className={`flex items-center justify-end relative ${
            !unClaimedRewards || unClaimedRewards.length === 0
              ? 'pb-6'
              : 'pb-16 top-11'
          }`}
        >
          {!VEmeta?.whitelisted_accounts?.includes(
            getCurrentWallet().wallet.getAccountId()
          ) ? null : (
            <div className={`absolute left-0 `}>
              <BorderGradientButton
                text={
                  <FormattedMessage
                    id="create_proposal"
                    defaultMessage={'Create Proposal'}
                  />
                }
                onClick={() => {
                  setShowCreateProposal(true);
                }}
                color="#182430"
              />
            </div>
          )}

          <span className="text-xs text-primaryText">
            <FormattedMessage id="voted_only" defaultMessage={'Voted only'} />
          </span>

          <CustomSwitch
            isOpen={votedOnly}
            setIsOpen={setVotedOnly}
            storageKey={VotedOnlyKey}
          />

          <SelectUI
            curvalue={state}
            list={['All', 'Live', 'Ended', 'Pending']}
            onChange={setState}
            className="ml-6"
            canSelect
          />
        </div>
      )}
      <div className="flex flex-col">
        {proposals
          ?.filter((p) => state === 'All' || proposalStatus[p.status] === state)
          ?.filter(
            (p) =>
              !votedOnly ||
              Object.keys(voteDetail || [])
                .concat(Object.keys(voteHistory || []))
                ?.includes(p.id.toString())
          )
          ?.sort((a, b) => b.id - a.id)
          .map((p) => (
            <GovProposalItem
              VEmeta={VEmeta}
              status={proposalStatus[p.status]}
              proposal={p}
              description={JSON.parse(
                p.kind.Poll
                  ? p.kind.Poll.description
                  : p.kind.Common.description
              )}
              setShowDetail={setShowDetail}
              showDetail={showDetail}
              voteHistory={voteHistory}
              voteDetail={voteDetail}
              unClaimed={
                !!UnclaimedProposal?.[p?.id] &&
                !ONLY_ZEROS.test(UnclaimedProposal?.[p?.id]?.amount)
              }
            />
          )) || []}
      </div>
    </div>
  );
};

interface ParamTypes {
  proposal_id: string;
}

export const ProposalCard = () => {
  const [curTab, setTab] = useState<PROPOSAL_TAB>(
    PROPOSAL_TAB[localStorage.getItem(REF_FI_PROPOSALTAB)] || PROPOSAL_TAB.FARM
  );

  const [farmProposal, setFarmProposal] = useState<Proposal>();

  const [lastRoundFarmProposal, setLastRoundFarmProposal] =
    useState<Proposal>();

  const [proposals, setProposals] = useState<Proposal[]>();

  const [showCreateProposal, setShowCreateProposal] = useState<boolean>(false);

  const config = useVEconfig();

  const proposal_id = window.location.pathname.split('/')?.[2];

  const [showDetail, setShowDetail] = useState<number>(
    proposal_id && Number(proposal_id) >= 0 ? Number(proposal_id) : undefined
  );

  useEffect(() => {
    getProposalList().then((list: Proposal[]) => {
      setProposals(list);
      const farmProposals = list.filter((p) =>
        Object.keys(p.kind).includes('FarmingReward')
      );

      const farmProposal =
        farmProposals.length === 1
          ? farmProposals[0]
          : _.maxBy(
              farmProposals.filter((p) => Number(p.start_at) < moment().unix()),
              (o) => Number(o.start_at)
            );

      const toSetFarmProposal =
        farmProposal || farmProposals[farmProposals.length - 1];

      setFarmProposal(toSetFarmProposal);

      const lastRoundProposal = _.maxBy(
        farmProposals.filter(
          (p) => p.id < toSetFarmProposal.id && p.status === 'Expired'
        ),
        (o) => Number(o.end_at)
      );

      setLastRoundFarmProposal(lastRoundProposal || undefined);
    });
  }, []);
  useEffect(() => {
    localStorage.setItem(REF_FI_PROPOSALTAB, curTab);
  }, [curTab]);

  return (
    <div className="w-full flex flex-col items-center ">
      <ProposalTab curTab={curTab} setTab={setTab} className="mt-12 mb-4" />
      <ProposalWrapper show={curTab === PROPOSAL_TAB.FARM}>
        {!farmProposal ? null : (
          <FarmProposal
            lastRoundFarmProposal={lastRoundFarmProposal}
            farmProposal={farmProposal}
          />
        )}
      </ProposalWrapper>

      <ProposalWrapper show={curTab === PROPOSAL_TAB.GOV} bgcolor={'bg-cardBg'}>
        {showCreateProposal ? (
          <CreateGovProposal
            show={showCreateProposal}
            setShow={setShowCreateProposal}
            index={proposals?.length || 0}
            config={config}
          />
        ) : (
          <GovProposal
            proposals={proposals?.filter(
              (p) => !Object.keys(p.kind).includes('FarmingReward')
            )}
            setShowCreateProposal={setShowCreateProposal}
            showDetail={showDetail}
            setShowDetail={setShowDetail}
          />
        )}
      </ProposalWrapper>
    </div>
  );
};
