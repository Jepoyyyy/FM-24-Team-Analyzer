import type { Metadata } from 'next';
import { TacticSquadMatrix } from '../../components/TacticSquadMatrix';

export const metadata: Metadata = {
  title: 'Player Performance Matrix · FM Tactical Builder',
  description: 'Role-specific player evidence with minutes and opportunity-aware reliability.',
};

export default function PlayerMatrixPage() {
  return <TacticSquadMatrix />;
}
