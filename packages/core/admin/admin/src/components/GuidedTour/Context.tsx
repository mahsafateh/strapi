import * as React from 'react';

import { produce } from 'immer';

import { GetGuidedTourMeta } from '../../../../shared/contracts/admin';
import { usePersistentState } from '../../hooks/usePersistentState';
import { createContext } from '../Context';

import { type Tours, tours as guidedTours } from './Tours';

/* -------------------------------------------------------------------------------------------------
 * GuidedTourProvider
 * -----------------------------------------------------------------------------------------------*/

type ValidTourName = keyof Tours;

export type ExtendedCompletedActions = (
  | GetGuidedTourMeta.Response['data']['completedActions'][number]
  | 'didCopyApiToken'
)[];

type Action =
  | {
      type: 'next_step';
      payload: ValidTourName;
    }
  | {
      type: 'skip_tour';
      payload: ValidTourName;
    }
  | {
      type: 'set_completed_actions';
      payload: ExtendedCompletedActions;
    }
  | {
      type: 'skip_all_tours';
    }
  | {
      type: 'reset_all_tours';
    };

type Tour = Record<ValidTourName, { currentStep: number; length: number; isCompleted: boolean }>;
type State = {
  tours: Tour;
  enabled: boolean;
  completedActions: ExtendedCompletedActions;
};

const [GuidedTourProviderImpl, useGuidedTour] = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>('GuidedTour');

const getInitialTourState = (tours: Tours) => {
  return Object.keys(tours).reduce((acc, tourName) => {
    const tourLength = Object.keys(tours[tourName as ValidTourName]).length;
    acc[tourName as ValidTourName] = {
      currentStep: 0,
      length: tourLength,
      isCompleted: false,
    };

    return acc;
  }, {} as Tour);
};

function reducer(state: State, action: Action): State {
  return produce(state, (draft) => {
    if (action.type === 'next_step') {
      const nextStep = draft.tours[action.payload].currentStep + 1;
      draft.tours[action.payload].currentStep = nextStep;
      draft.tours[action.payload].isCompleted = nextStep === draft.tours[action.payload].length;
    }

    if (action.type === 'skip_tour') {
      draft.tours[action.payload].isCompleted = true;
    }

    if (action.type === 'set_completed_actions') {
      draft.completedActions = [...new Set([...draft.completedActions, ...action.payload])];
    }

    if (action.type === 'skip_all_tours') {
      draft.enabled = false;
    }

    if (action.type === 'reset_all_tours') {
      draft.enabled = true;
      draft.tours = getInitialTourState(guidedTours);
      draft.completedActions = [];
    }
  });
}

const STORAGE_KEY = 'STRAPI_GUIDED_TOUR';
const GuidedTourContext = ({
  children,
  enabled = true,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) => {
  const [tours, setTours] = usePersistentState<State>(STORAGE_KEY, {
    tours: getInitialTourState(guidedTours),
    enabled,
    completedActions: [],
  });
  const [state, dispatch] = React.useReducer(reducer, tours);

  // Sync local storage
  React.useEffect(() => {
    setTours(state);
  }, [state, setTours]);

  return (
    <GuidedTourProviderImpl state={state} dispatch={dispatch}>
      {children}
    </GuidedTourProviderImpl>
  );
};

export type { Action, State, ValidTourName };
export { GuidedTourContext, useGuidedTour, reducer };
