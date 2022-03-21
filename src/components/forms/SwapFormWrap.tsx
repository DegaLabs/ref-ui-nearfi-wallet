import React, { useEffect, useState, useContext } from 'react';
import Alert from '../alert/Alert';
import SubmitButton from './SubmitButton';
import { FormattedMessage } from 'react-intl';
import SlippageSelector, { StableSlipSelecter } from './SlippageSelector';
import { SwapRefresh, CountdownTimer } from '~components/icon';
import { wallet } from '~services/near';
import { getCurrentWallet, WalletContext } from '../../utils/sender-wallet';
import { SWAP_MODE } from '../../pages/SwapPage';
import SlippageSelectorForStable from './SlippageSelector';

interface SwapFormWrapProps {
  title?: string;
  buttonText?: string;
  canSubmit?: boolean;
  slippageTolerance: number;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  info?: string | JSX.Element;
  showElseView?: boolean;
  elseView?: JSX.Element;
  onChange: (slippage: number) => void;
  bindUseBalance: (useNearBalance: boolean) => void;
  loading?: {
    loadingData: boolean;
    setLoadingData: (loading: boolean) => void;
    loadingTrigger: boolean;
    setLoadingTrigger: (loaidngTrigger: boolean) => void;
    loadingPause: boolean;
    setLoadingPause: (pause: boolean) => void;
    showSwapLoading: boolean;
    setShowSwapLoading: (swapLoading: boolean) => void;
  };
  useNearBalance: string;
  swapMode?: SWAP_MODE;
}

export default function SwapFormWrap({
  children,
  title,
  buttonText,
  slippageTolerance,
  canSubmit = true,
  onSubmit,
  info,
  showElseView,
  elseView,
  onChange,
  bindUseBalance,
  loading,
  useNearBalance,
  swapMode,
}: React.PropsWithChildren<SwapFormWrapProps>) {
  const [error, setError] = useState<Error>();

  const [inValid, setInvalid] = useState(false);

  const {
    loadingData,
    setLoadingData,
    loadingTrigger,
    setLoadingTrigger,
    loadingPause,
    setLoadingPause,
    showSwapLoading,
    setShowSwapLoading,
  } = loading;

  useEffect(() => {
    loadingTrigger && setShowSwapLoading(true);
    !loadingTrigger && setShowSwapLoading(false);
  }, [loadingTrigger]);

  const { signedInState } = useContext(WalletContext);
  const isSignedIn = signedInState.isSignedIn;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (isSignedIn) {
      try {
        setShowSwapLoading(true);
        setLoadingPause(true);
        onSubmit(event);
      } catch (err) {
        setError(err);
      }
    }
  };

  return (
    <form
      className={`overflow-y-visible bg-secondary shadow-2xl rounded-2xl p-7 ${
        swapMode === SWAP_MODE.STABLE ? 'pb-16' : ''
      } bg-dark xs:rounded-lg md:rounded-lg overflow-x-visible`}
      onSubmit={handleSubmit}
    >
      {title && (
        <>
          <h2 className="formTitle flex justify-between font-bold text-xl text-white text-left pb-4">
            <FormattedMessage id={title} defaultMessage={title} />
            <div className="flex items-center">
              <div
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (loadingPause) {
                    setLoadingPause(false);
                    setLoadingTrigger(true);
                    setLoadingData(true);
                  } else {
                    setLoadingPause(true);
                    setLoadingTrigger(false);
                  }
                }}
                className="mx-4 cursor-pointer"
              >
                <CountdownTimer
                  loadingTrigger={loadingTrigger}
                  loadingPause={loadingPause}
                />
              </div>

              {swapMode === SWAP_MODE.NORMAL ? (
                <SlippageSelector
                  slippageTolerance={slippageTolerance}
                  onChange={onChange}
                  bindUseBalance={bindUseBalance}
                  useNearBalance={useNearBalance}
                />
              ) : null}
              {swapMode === SWAP_MODE.STABLE ? (
                <SlippageSelectorForStable
                  slippageTolerance={slippageTolerance}
                  onChange={onChange}
                  validSlippageList={[0.05, 0.1, 0.2]}
                  useNearBalance={useNearBalance}
                  bindUseBalance={bindUseBalance}
                />
              ) : null}
            </div>
          </h2>
        </>
      )}
      {error && <Alert level="warn" message={error.message} />}
      {children}
      {showElseView && elseView ? (
        elseView
      ) : (
        <SubmitButton
          disabled={!canSubmit && !loadingTrigger}
          text={buttonText || title}
          info={info}
          loading={showSwapLoading}
        />
      )}
    </form>
  );
}
