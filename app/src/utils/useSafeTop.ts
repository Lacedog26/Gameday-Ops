import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useSafeTop(extra = 12): number {
  const insets = useSafeAreaInsets();
  return insets.top + extra;
}
