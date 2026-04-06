import { StyleSheet, View, Modal, Pressable } from 'react-native'
import React from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { primary } from '@/constants/colors'

const DatePickerModal = ({
  visible,
  onClose,
  selectedDate,
  onChangeDate,
}: {
  visible: boolean
  onClose: () => void
  selectedDate: Date
  onChangeDate: (event: any, date?: Date) => void
}) => {
  const { bottom } = useSafeAreaInsets()

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      transparent={true}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.pickerContainer,
            {
              marginBottom: bottom,
              backgroundColor: primary[900],
            },
          ]}
        >
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="inline"
            onChange={onChangeDate}
            maximumDate={new Date()}
            accentColor={primary[400]}
          />
        </View>
      </View>
    </Modal>
  )
}

export default DatePickerModal

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    // backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    borderRadius: 30,
    padding: 20,
    width: '95%',
  },
})
