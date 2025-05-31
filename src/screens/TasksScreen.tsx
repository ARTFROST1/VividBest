import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, Platform, Animated, Switch, ActionSheetIOS, Modal, TouchableOpacity, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, LayoutChangeEvent, ScrollView, Alert, Linking } from 'react-native';
import { Icon, Checkbox, Text, TextInput, Button, Card, useTheme, FAB, ProgressBar, Menu, Divider, Chip, IconButton } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useTags } from '../hooks/useTags';
import { TagSelector } from '../components/TagSelector';
import { PrioritySelector } from '../components/PrioritySelector';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  repeatInterval: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminderTime?: string; // HH:mm
  notificationId?: string;
}

const PRIORITY_COLORS = {
  low: '#83be7d',
  medium: '#ebbf5a',
  high: '#bf4c38',
};

const PRIORITY_LABELS = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const REPEAT_LABELS = {
  none: 'Не повторять',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Каждый год',
};

const TASKS_STORAGE_KEY = 'TASKS_V1';

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const TasksScreen = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTabIndex, setSelectedTabIndex] = useState(1); // Default to 'Today' (middle tab)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState(new Date());
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [repeatInterval, setRepeatInterval] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [reminderTime, setReminderTime] = useState<string | undefined>(undefined);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [prioritySelected, setPrioritySelected] = useState(false);
  const [repeatSelected, setRepeatSelected] = useState(false);
  const theme = useTheme();
  const { colors, roundness } = theme;
  const c = colors as any;
  const {
    tags: allTags,
    addTag: addGlobalTag,
    removeTag: removeGlobalTag,
    updateTag: updateGlobalTag,
  } = useTags();
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { t } = useTranslation();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [sendNotification, setSendNotification] = useState(true);
  const [optionsAnim] = useState(new Animated.Value(0));
  const [showDatePickerInline, setShowDatePickerInline] = useState(false);
  const [showTimePickerInline, setShowTimePickerInline] = useState(false);
  const inputRef = useRef(null);
  const [barWidth, setBarWidth] = useState(0);
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const saved = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
        if (saved) {
          const parsed: Task[] = JSON.parse(saved);
          setTasks(parsed);
          // Восстановить уведомления для актуальных задач
          parsed.forEach(async (task) => {
            if (!task.completed && task.reminderTime && !task.notificationId) {
              const notificationId = await scheduleTaskNotification(task);
              setTasks((prev) =>
                prev.map((t) =>
                  t.id === task.id ? { ...t, notificationId } : t
                )
              );
            }
          });
        }
      } catch (e) {
        console.error('Ошибка загрузки задач:', e);
      }
    };
    loadTasks();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  // Get tasks based on selected tab
  const getFilteredTasks = () => {
    // For Past tab (index 0), show tasks grouped by date
    if (selectedTabIndex === 0) {
      return tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return taskDate < today;
      }).sort((a, b) => {
        // Sort by date (newest first)
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      });
    } 
    // For Today and Tomorrow tabs, keep existing behavior
    return tasks
      .filter(task => task.dueDate === formatDate(selectedDate))
      .sort((a, b) => {
        // Сначала невыполненные, потом выполненные
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        // Внутри групп — по приоритету
        const order = { high: 2, medium: 1, low: 0 };
        return order[b.priority] - order[a.priority];
      });
  };

  const filteredTasks = getFilteredTasks();

  const completedCount = filteredTasks.filter(t => t.completed).length;
  const progress = filteredTasks.length > 0 ? completedCount / filteredTasks.length : 0;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  async function scheduleTaskNotification(task: Task): Promise<string | undefined> {
    if (!task.reminderTime) return undefined;
    const [h, m] = task.reminderTime.split(':').map(Number);
    const due = new Date(task.dueDate + 'T' + task.reminderTime + ':00');
    if (due < new Date()) return undefined;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Напоминание о задаче',
        body: task.title,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        year: due.getFullYear(),
        month: due.getMonth() + 1, // JS: 0-11, Expo: 1-12
        day: due.getDate(),
        hour: due.getHours(),
        minute: due.getMinutes(),
        second: 0,
        repeats: false,
      },
    });
    return id;
  }

  async function cancelTaskNotification(notificationId?: string) {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    }
  }

  const handleSelectTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  async function updateTaskNotification(task: Task): Promise<string | undefined> {
    if (task.notificationId) {
      await cancelTaskNotification(task.notificationId);
    }
    if (task.reminderTime) {
      return await scheduleTaskNotification(task);
    }
    return undefined;
  }

  async function ensureNotificationPermission(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: reqStatus } = await Notifications.requestPermissionsAsync();
      if (reqStatus !== 'granted') {
        alert(t('notification_permission_denied', 'Разрешение на уведомления не выдано. Напоминания не будут работать.'));
        return false;
      }
    }
    return true;
  }

  const handleAddTask = async () => {
    if (newTask.trim()) {
      let notificationId: string | undefined = undefined;
      if (reminderTime && sendNotification) {
        const hasPerm = await ensureNotificationPermission();
        if (hasPerm) {
          notificationId = await scheduleTaskNotification({
            id: '',
            title: newTask.trim(),
            completed: false,
            dueDate: formatDate(newTaskDate),
            priority,
            tags: selectedTagIds.map(id => allTags.find(t => t.id === id)?.name || ''),
            repeatInterval,
            reminderTime,
            notificationId: undefined,
          });
        }
      }
      setTasks(prev => [
        {
          id: Date.now().toString(),
          title: newTask.trim(),
          completed: false,
          dueDate: formatDate(newTaskDate),
          priority,
          tags: selectedTagIds.map(id => allTags.find(t => t.id === id)?.name || ''),
          repeatInterval,
          reminderTime,
          notificationId,
        },
        ...prev,
      ]);
      setNewTask('');
      setInputVisible(false);
      setNewTaskDate(selectedDate);
      setPriority('medium');
      setPrioritySelected(false);
      setSelectedTagIds([]);
      setRepeatInterval('none');
      setRepeatSelected(false);
      setReminderTime(undefined);
    }
  };

  function getNextDate(date: Date, interval: 'daily' | 'weekly' | 'monthly') {
    const d = new Date(date);
    if (interval === 'daily') d.setDate(d.getDate() + 1);
    if (interval === 'weekly') d.setDate(d.getDate() + 7);
    if (interval === 'monthly') d.setMonth(d.getMonth() + 1);
    return d;
  }

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        if (!task.completed && task.repeatInterval !== 'none') {
          const nextDate = getNextDate(new Date(task.dueDate), task.repeatInterval as any);
          (async () => {
            let notificationId: string | undefined = undefined;
            if (task.reminderTime) {
              notificationId = await scheduleTaskNotification({
                ...task,
                dueDate: formatDate(nextDate),
              });
            }
            setTasks(tasks => [
              ...tasks,
              {
                ...task,
                id: Date.now().toString() + Math.random(),
                completed: false,
                dueDate: formatDate(nextDate),
                notificationId,
              },
            ]);
          })();
        }
        if (!task.completed && task.notificationId) {
          cancelTaskNotification(task.notificationId);
        }
        return { ...task, completed: !task.completed };
      }
      return task;
    }));
  };

  const handleToggleReminder = async (task: Task) => {
    if (task.reminderTime) {
      if (task.notificationId) await cancelTaskNotification(task.notificationId);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminderTime: undefined, notificationId: undefined } : t));
    } else {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 5);
      const h = now.getHours().toString().padStart(2, '0');
      const m = now.getMinutes().toString().padStart(2, '0');
      const reminderTime = `${h}:${m}`;
      const hasPerm = await ensureNotificationPermission();
      let notificationId: string | undefined = undefined;
      if (hasPerm) {
        notificationId = await scheduleTaskNotification({ ...task, reminderTime });
      }
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, reminderTime, notificationId } : t));
    }
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.notificationId) {
      await cancelTaskNotification(task.notificationId);
    }
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const renderRightActions = (item: Task) => (
    <TouchableOpacity
      style={styles.swipeDeleteButton}
      onPress={() => handleDeleteTask(item.id)}
    >
      <IconButton icon="trash-can-outline" size={25} iconColor="#FFFFFF" style={styles.swipeActionIcon} />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Task }) => (
    <Swipeable
      renderRightActions={() => renderRightActions(item)}
      overshootRight={false}
    >
      <Card style={[
        styles.taskCard,
        {
          backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF',
          borderRadius: 12,
          shadowColor: theme.dark ? '#000000' : '#000000',
          shadowOpacity: theme.dark ? 0.3 : 0.08,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 1 },
          elevation: 2,
          opacity: item.completed ? 0.6 : 1,
          borderWidth: theme.dark ? 0.5 : 0,
          borderColor: theme.dark ? '#1C1C1E' : 'transparent',
        },
      ]}>
        <View style={styles.taskRow}>
          <View style={{ marginRight: 10 }}>
            <Checkbox
              status={item.completed ? 'checked' : 'unchecked'}
              onPress={() => handleToggleTask(item.id)}
              color={PRIORITY_COLORS[item.priority]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={item.completed ? { opacity: 0.8 } : undefined}>
              <Text
                style={[
                  styles.taskTitle,
                  {
                    color: theme.dark ? '#FFFFFF' : '#000000',
                    textDecorationLine: item.completed ? 'line-through' : 'none',
                  },
                ]}
              >
                {item.title}
              </Text>
              <View style={styles.taskMetaRow}>
                <Text style={[styles.taskMeta, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>{item.dueDate}</Text>
                <Text style={[styles.taskMeta, { color: PRIORITY_COLORS[item.priority], fontWeight: '500' }]}>{PRIORITY_LABELS[item.priority]}</Text>
                {item.reminderTime && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Icon source="clock-outline" size={12} color={theme.dark ? '#8E8E93' : '#8E8E93'} />
                    <Text style={{ fontSize: 12, color: theme.dark ? '#8E8E93' : '#8E8E93', marginLeft: 2 }}>{item.reminderTime}</Text>
                  </View>
                )}
                {item.tags && item.tags.map(tag => (
                  <View key={tag} style={item.completed ? { opacity: 0.7 } : undefined}>
                    <Text style={[styles.tag, { backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', color: theme.dark ? '#FFFFFF' : '#000000' }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <Icon source="chevron-right" size={20} color={theme.dark ? '#636366' : '#C7C7CC'} />
        </View>
      </Card>
    </Swipeable>
  );

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      // Update selected tab based on the date
      const today = new Date();
      const tomorrow = addDays(today, 1);
      
      if (formatDate(date) === formatDate(today)) {
        setSelectedTabIndex(1); // Today
      } else if (formatDate(date) === formatDate(tomorrow)) {
        setSelectedTabIndex(2); // Tomorrow
      } else if (date < today) {
        setSelectedTabIndex(0); // Past
      }
    }
  };

  const handleTabChange = (event: any) => {
    const index = event.nativeEvent.selectedSegmentIndex;
    setSelectedTabIndex(index);
    
    const today = new Date();
    
    switch(index) {
      case 0: // Past - set to yesterday for now
        setSelectedDate(addDays(today, -1));
        break;
      case 1: // Today
        setSelectedDate(today);
        break;
      case 2: // Tomorrow
        setSelectedDate(addDays(today, 1));
        break;
    }
  };

  const handleNewTaskDateChange = (event: any, date?: Date) => {
    if (date) {
      setNewTaskDate(date);
    }
  };

  const handleInputFocus = () => setIsInputFocused(true);
  const handleInputBlur = () => {
    if (!newTask.trim()) setIsInputFocused(false);
  };

  // Group past tasks by date categories
  const groupTasksByDate = (tasks: Task[]) => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const lastWeekStart = new Date(today);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return {
      yesterday: tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getTime() >= yesterday.getTime() && taskDate.getTime() < today.getTime();
      }),
      lastWeek: tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getTime() >= lastWeekStart.getTime() && taskDate.getTime() < yesterday.getTime();
      }),
      lastMonth: tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getTime() >= thirtyDaysAgo.getTime() && taskDate.getTime() < lastWeekStart.getTime();
      }),
      older: tasks.filter(task => {
        const taskDate = new Date(task.dueDate);
        return taskDate.getTime() < thirtyDaysAgo.getTime();
      })
    };
  };

  // Анимация появления/скрытия блока опций
  useEffect(() => {
    if (isInputFocused) {
      Animated.timing(optionsAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(optionsAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }
  }, [isInputFocused]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
    >
      <View style={[styles.container, { backgroundColor: theme.dark ? '#000000' : '#F2F2F7' }]}>
        <Text style={[styles.header, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('daily_tasks', 'Мой поток задач')}</Text>
        {/* Выбор даты - тройной переключатель */}
        <View style={styles.dateRow}>
          <View style={styles.segmentedControlContainer}>
            <View style={[styles.segmentedControl, { backgroundColor: theme.dark ? '#1C1C1E' : '#E9E9EB' }]}>
              {[t('past', 'Прошлые'), t('today', 'Сегодня'), t('tomorrow', 'Завтра')].map((value, index) => {
                const isSelected = index === selectedTabIndex;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.segmentButton,
                      index === 0 && styles.leftSegment,
                      index === 2 && styles.rightSegment,
                    ]}
                    onPress={() => handleTabChange({ nativeEvent: { selectedSegmentIndex: index } })}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={['#7745dc', '#f34f8c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.selectedSegment, { position: 'absolute', width: '100%', height: '100%' }]}
                      />
                    ) : null}
                    <Text
                      style={[
                        styles.segmentButtonText,
                        {
                          color: isSelected ? '#FFFFFF' : theme.dark ? '#FFFFFF' : '#000000',
                          fontWeight: isSelected ? '600' : '400',
                        },
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              themeVariant={theme.dark ? 'dark' : 'light'}
              onChange={handleDateChange}
              style={{ width: 140 }}
            />
          </View>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        {filteredTasks.length > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { backgroundColor: theme.dark ? '#38383A' : '#E5E5EA', overflow: 'hidden' }]}
              onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
            >
              <LinearGradient
                colors={['#7745dc', '#f34f8c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              {barWidth > 0 && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: animatedProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [barWidth, 0],
                    }),
                    backgroundColor: theme.dark ? '#38383A' : '#E5E5EA',
                  }}
                />
              )}
            </View>
            <Text style={[styles.progressText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>{Math.round(progress * 100)}% {t('completed', 'выполнено')}</Text>
          </View>
        )}
        {selectedTabIndex !== 0 && (
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                value={newTask}
                onChangeText={setNewTask}
                placeholder={t('add_task_placeholder', 'Новая задача...')}
                style={[
                  styles.input, 
                  { 
                    backgroundColor: theme.dark ? '#1c1c1e' : '#e4e3e9',
                    color: theme.dark ? '#888888' : '#888888',
                    borderColor: theme.dark ? '#333333' : '#e4e3e9'
                  }
                ]}
                placeholderTextColor={theme.dark ? '#888888' : '#888888'}
                onFocus={handleInputFocus}
                onBlur={() => {}}
              />
            </View>
          </View>
        )}
        {/* Блок создания заметки только при isInputFocused */}
        {isInputFocused && (
          <Animated.View
            style={{
              opacity: optionsAnim,
              transform: [{ translateY: optionsAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              marginBottom: 12,
              backgroundColor: colors.elevation?.level2 || (theme.dark ? colors.surface : colors.background),
              borderRadius: roundness * 2, 
              padding: 16,
              shadowColor: theme.dark ? '#000' : '#222',
              shadowOpacity: 0.10,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
          >
            <View style={[styles.iosBlock, { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF', borderRadius: 16, shadowColor: theme.dark ? '#000000' : '#000000' }]}>
              {/* Одна строка: дата слева, время справа */}
              <View style={styles.iosRowHorizontal}>
                {/* Левая часть — дата */}
                <View style={styles.iosCol}>
                  <Text style={[styles.iosLabel, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('date', 'Дата')}</Text>
                  <DateTimePicker
                    value={newTaskDate}
                    mode="date"
                    display="default"
                    themeVariant={theme.dark ? 'dark' : 'light'}
                    onChange={(event, date) => {
                      if (date) setNewTaskDate(date);
                    }}
                    style={{ width: 120 }}
                  />
                </View>
                {/* Правая часть — время */}
                <View style={styles.iosCol}>
                  <Text style={[styles.iosLabel, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('time', 'Время')}</Text>
                  <DateTimePicker
                    value={reminderTime ? new Date(`${formatDate(newTaskDate)}T${reminderTime}:00`) : newTaskDate}
                    mode="time"
                    is24Hour={true}
                    display="default"
                    themeVariant={theme.dark ? 'dark' : 'light'}
                    onChange={(event, date) => {
                      if (date) {
                        const h = date.getHours().toString().padStart(2, '0');
                        const m = date.getMinutes().toString().padStart(2, '0');
                        setReminderTime(`${h}:${m}`);
                      }
                    }}
                    style={{ width: 120 }}
                  />
                </View>
              </View>
              {/* Остальные элементы блока (приоритет, повтор, переключатель, +Добавить) идут ниже, с отступами */}

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.iosButton, { flex: 1, marginRight: 8, backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', borderColor: theme.dark ? '#3C3C3E' : '#E5E5EA', borderRadius: 10 }]}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      ActionSheetIOS.showActionSheetWithOptions({
                        options: [PRIORITY_LABELS.low, PRIORITY_LABELS.medium, PRIORITY_LABELS.high, t('cancel', 'Отмена')],
                        cancelButtonIndex: 3,
                        title: t('priority', 'Приоритет'),
                      }, (buttonIndex) => {
                        if (buttonIndex === 0) { setPriority('low'); setPrioritySelected(true); }
                        if (buttonIndex === 1) { setPriority('medium'); setPrioritySelected(true); }
                        if (buttonIndex === 2) { setPriority('high'); setPrioritySelected(true); }
                      });
                    } else {
                      setShowPriorityModal(true);
                    }
                  }}
                >
                  <Text style={[styles.iosButtonText, { color: prioritySelected ? '#8a44da' : '#888888' }]}>{prioritySelected ? PRIORITY_LABELS[priority] : t('priority', 'Приоритет')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iosButton, { flex: 1, backgroundColor: theme.dark ? '#2C2C2E' : '#F2F2F7', borderColor: theme.dark ? '#3C3C3E' : '#E5E5EA', borderRadius: 10 }]}
                  onPress={() => {
                    if (Platform.OS === 'ios') {
                      ActionSheetIOS.showActionSheetWithOptions({
                        options: [REPEAT_LABELS.none, REPEAT_LABELS.daily, REPEAT_LABELS.weekly, REPEAT_LABELS.monthly, REPEAT_LABELS.yearly, t('cancel', 'Отмена')],
                        cancelButtonIndex: 5,
                        title: t('repeat', 'Повторять'),
                      }, (buttonIndex) => {
                        if (buttonIndex === 0) { setRepeatInterval('none'); setRepeatSelected(true); }
                        if (buttonIndex === 1) { setRepeatInterval('daily'); setRepeatSelected(true); }
                        if (buttonIndex === 2) { setRepeatInterval('weekly'); setRepeatSelected(true); }
                        if (buttonIndex === 3) { setRepeatInterval('monthly'); setRepeatSelected(true); }
                        if (buttonIndex === 4) { setRepeatInterval('yearly'); setRepeatSelected(true); }
                      });
                    } else {
                      setShowRepeatModal(true);
                    }
                  }}
                >
                  <Text style={[styles.iosButtonText, { color: repeatSelected ? '#8a44da' : '#888888' }]}>{repeatSelected ? REPEAT_LABELS[repeatInterval] : t('repeat', 'Повторять')}</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ flex: 1, color: theme.dark ? '#FFFFFF' : '#000000', fontSize: 16 }}>{t('send_notification', 'Отправить уведомление')}</Text>
                <Switch
                  value={sendNotification}
                  onValueChange={setSendNotification}
                  thumbColor={sendNotification ? '#FFFFFF' : '#FFFFFF'}
                  trackColor={{ true: '#8a44da', false: theme.dark ? '#636366' : '#E5E5EA' }}
                  ios_backgroundColor={theme.dark ? '#636366' : '#E5E5EA'}
                />
              </View>
              {/* Две кнопки внизу: Отмена и Добавить */}
              <View style={styles.iosButtonRow}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setIsInputFocused(false);
                    setNewTask('');
                    if (inputRef.current) inputRef.current.blur();
                  }}
                  style={[styles.iosCancelBtn, { borderColor: '#8a44da', borderRadius: 10 }]}
                  textColor="#8a44da"
                >
                  {t('cancel', 'Отмена')}
                </Button>
                <LinearGradient
                  colors={['#7745dc', '#f34f8c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.iosAddBtn, { borderRadius: 10 }]}
                >
                  <Button
                    mode="contained"
                    onPress={() => {
                      handleAddTask();
                      setIsInputFocused(false);
                      if (inputRef.current) inputRef.current.blur();
                    }}
                    style={{ backgroundColor: 'transparent', elevation: 0 }}
                    textColor={'#fff'}
                  >
                    {t('add', 'Добавить')}
                  </Button>
                </LinearGradient>
              </View>
            </View>
            {/* Модальные окна для Android (если нужно) */}
            <Modal visible={showPriorityModal} transparent animationType="fade" onRequestClose={() => setShowPriorityModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF', borderRadius: 14 }]}>
                  {(['low', 'medium', 'high'] as const).map((p) => (
                    <TouchableOpacity key={p} onPress={() => { setPriority(p); setPrioritySelected(true); setShowPriorityModal(false); }} style={styles.modalOption}>
                      <Text style={{ color: theme.dark ? '#FFFFFF' : '#000000', fontSize: 17, fontWeight: '400' }}>{PRIORITY_LABELS[p]}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setShowPriorityModal(false)} style={styles.modalOption}>
                    <Text style={{ color: '#FF3B30', fontSize: 17, fontWeight: '600' }}>{t('cancel', 'Отмена')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            <Modal visible={showRepeatModal} transparent animationType="fade" onRequestClose={() => setShowRepeatModal(false)}>
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.dark ? '#1C1C1E' : '#FFFFFF', borderRadius: 14 }]}>
                  {(['none', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((interval) => (
                    <TouchableOpacity key={interval} onPress={() => { setRepeatInterval(interval as any); setRepeatSelected(true); setShowRepeatModal(false); }} style={styles.modalOption}>
                      <Text style={{ color: theme.dark ? '#FFFFFF' : '#000000', fontSize: 17, fontWeight: '400' }}>{REPEAT_LABELS[interval]}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setShowRepeatModal(false)} style={styles.modalOption}>
                    <Text style={{ color: '#FF3B30', fontSize: 17, fontWeight: '600' }}>{t('cancel', 'Отмена')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </Animated.View>
        )}
        <Divider style={[styles.divider, { backgroundColor: c.divider }]} />
        {selectedTabIndex === 0 ? (
          // Past tasks grouped by date
          <ScrollView 
            style={{flex: 1}}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {(() => {
              const groupedTasks = groupTasksByDate(filteredTasks);
              return (
                <>
                  {/* Yesterday */}
                  {groupedTasks.yesterday.length > 0 && (
                    <>
                      <Text style={[styles.timeGroupHeader, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('yesterday', 'Вчера')}</Text>
                      {groupedTasks.yesterday.map(item => (
                        <View key={item.id} style={{marginBottom: 8}}>
                          {renderItem({item})}
                        </View>
                      ))}
                    </>
                  )}
                  
                  {/* Last Week */}
                  {groupedTasks.lastWeek.length > 0 && (
                    <>
                      <Text style={[styles.timeGroupHeader, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('last_week', 'На прошлой неделе')}</Text>
                      {groupedTasks.lastWeek.map(item => (
                        <View key={item.id} style={{marginBottom: 8}}>
                          {renderItem({item})}
                        </View>
                      ))}
                    </>
                  )}
                  
                  {/* Last 30 Days */}
                  {groupedTasks.lastMonth.length > 0 && (
                    <>
                      <Text style={[styles.timeGroupHeader, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('last_30_days', 'Предыдущие 30 дней')}</Text>
                      {groupedTasks.lastMonth.map(item => (
                        <View key={item.id} style={{marginBottom: 8}}>
                          {renderItem({item})}
                        </View>
                      ))}
                    </>
                  )}
                  
                  {/* Older */}
                  {groupedTasks.older.length > 0 && (
                    <>
                      <Text style={[styles.timeGroupHeader, { color: theme.dark ? '#FFFFFF' : '#000000' }]}>{t('older', 'Более старые')}</Text>
                      {groupedTasks.older.map(item => (
                        <View key={item.id} style={{marginBottom: 8}}>
                          {renderItem({item})}
                        </View>
                      ))}
                    </>
                  )}
                  
                  {/* No tasks message */}
                  {filteredTasks.length === 0 && (
                    <Text style={[styles.emptyListText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>{t('no_past_tasks', 'Нет прошедших задач')}</Text>
                  )}
                </>
              );
            })()} 
          </ScrollView>
        ) : (
          // Regular task list for Today and Tomorrow tabs
          <FlatList
            data={filteredTasks}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    fontSize: 30,
    fontWeight: '600',
    marginBottom: 16,
    paddingTop: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  inputContainer: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    flex: 1,
    marginRight: 8,
    fontSize: 17,
    height: 36,
    borderWidth: 0,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 0,
    backgroundColor: '#F2F2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addBtn: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },

  divider: {
    height: 0,
    marginVertical: 4,
  },
  listContent: {
    paddingBottom: 32,
    paddingTop: 0,
  },
  taskCard: {
    marginVertical: 2,
    marginHorizontal: 2,
    elevation: 2,
    padding: 0,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
  },
  taskTitle: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  swipeActionIcon: {
    margin: 0,
    padding: 0,
    marginBottom: -2,
  },
  taskMeta: {
    fontSize: 13,
    marginRight: 8,
    color: '#8E8E93',
    fontWeight: '400',
  },
  tag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
    marginRight: 0,
    fontWeight: '500',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  segmentedControlContainer: {
    flex: 2,
    marginRight: 10,
  },
  segmentedControl: {
    height: 34,
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E9E9EB',
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'transparent',
    borderRadius: 6,
    marginHorizontal: 1,
  },
  selectedSegment: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    borderRadius: 6,
  },
  leftSegment: {
    marginLeft: 0,
  },
  rightSegment: {
    marginRight: 0,
  },
  segmentButtonText: {
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  dateButtonText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  timeGroupHeader: {
    fontSize: 23,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  calendarButton: {
    marginRight: 8,
  },
  selectedDateText: {
    fontSize: 14,
    color: '#888',
    marginLeft: 4,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressText: {
    textAlign: 'right',
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
    fontWeight: '400',
  },
  optionsRow: {
    marginBottom: 8,
    gap: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  repeatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iosBlock: {
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#222',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  iosRowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  iosCol: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  iosLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
    textAlign: 'left',
    color: '#000000',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  iosPickerWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  iosPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    marginBottom: 2,
    marginTop: 2,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },
  iosPickerValue: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
    color: '#8a44da',
    letterSpacing: -0.2,
  },
  iosInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    marginBottom: 0,
    minHeight: 40,
    justifyContent: 'center',
    backgroundColor: '#F2F2F7',
  },
  iosInputText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: -0.2,
  },
  iosMeta: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
    color: '#8E8E93',
    letterSpacing: -0.1,
  },
  iosButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    marginBottom: 0,
  },
  iosButtonText: {
    color: '#8a44da',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    minWidth: 270,
    alignItems: 'stretch',
  },
  modalOption: {
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  iosButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
    marginHorizontal: 4,
  },
  iosCancelBtn: {
    flex: 1,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: '#8a44da',
  },
  iosAddBtn: {
    flex: 1,
    borderRadius: 10,
    marginLeft: 8,
    backgroundColor: '#8a44da',
  },
  swipeDeleteButton: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '85%',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: 5,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default TasksScreen; 