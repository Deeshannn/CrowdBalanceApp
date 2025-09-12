import { StatusBar as RNStatusBar } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const AppStatusBar = ({ backgroundColor = "black", barStyle = "light-content" }) => {
  const insets = useSafeAreaInsets(); // dynamically get safe area insets

  return (
    <>
      {/* Safe area padding for iOS */}
      <SafeAreaView style={{ backgroundColor, paddingTop: insets.top }} />

      {/* Actual status bar */}
      <RNStatusBar
        translucent={false}
        backgroundColor={backgroundColor}
        barStyle={barStyle}
      />
    </>
  );
};

export default AppStatusBar;
