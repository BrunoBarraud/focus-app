"use client";

import * as React from "react";
import {
  addHabitAction,
  deleteHabitAction,
  renameHabitAction,
  setHabitDayAction,
} from "@/app/actions/habits";
import { useToast } from "@/components/ui/toast";
import { dateForDay, monthLength, toMonthView } from "@/lib/habits";
import type { Habit, HabitCategory, HabitMonthView } from "@/lib/types";
import { useToday } from "@/lib/use-today";
import { useServerState } from "@/lib/client-hooks";

const TEMP_PREFIX = "temp-";
export const isTempId = (id: string) => id.startsWith(TEMP_PREFIX);

/**
 * Estado y mutaciones de hábitos compartidos por el dashboard y /habitos.
 * Las actualizaciones son optimistas y, si fallan, se revierte SOLO el ítem
 * afectado (no una foto vieja de toda la lista que pisaría otros cambios).
 */
export function useHabits(initialHabits: Habit[]) {
  const toast = useToast();
  const today = useToday();
  // Cuando el Server Component revalida, la verdad del servidor reemplaza al estado local.
  const [habits, setHabits] = useServerState<Habit[]>(initialHabits);
  const [pending, setPending] = React.useState<ReadonlySet<string>>(new Set());

  const views: HabitMonthView[] = React.useMemo(
    () => (today ? habits.map((h) => toMonthView(h, today)) : []),
    [habits, today]
  );

  const updateHabit = (id: string, fn: (h: Habit) => Habit) =>
    setHabits((prev) => prev.map((h) => (h.id === id ? fn(h) : h)));

  const setDate = (habitId: string, date: string, completed: boolean) =>
    updateHabit(habitId, (h) => ({
      ...h,
      completedDates: completed
        ? [...new Set([...h.completedDates, date])]
        : h.completedDates.filter((d) => d !== date),
    }));

  const toggleDay = async (habitId: string, day: number) => {
    if (!today || isTempId(habitId)) return;
    const date = dateForDay(today, day);
    if (date > today) return; // No se pueden marcar días futuros.
    const key = `${habitId}|${date}`;
    if (pending.has(key)) return;

    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    const next = !habit.completedDates.includes(date);

    setDate(habitId, date, next);
    setPending((prev) => new Set(prev).add(key));
    const res = await setHabitDayAction(habitId, date, next);
    setPending((prev) => {
      const copy = new Set(prev);
      copy.delete(key);
      return copy;
    });
    if (!res.ok) {
      setDate(habitId, date, !next);
      toast.error(res.error);
    }
  };

  const addHabit = async (input: { name: string; category: HabitCategory; monthlyTargetDays: number }) => {
    const tempId = `${TEMP_PREFIX}${crypto.randomUUID()}`;
    setHabits((prev) => [...prev, { id: tempId, color: "#10b981", completedDates: [], ...input }]);

    const res = await addHabitAction(input);
    if (res.ok) {
      updateHabit(tempId, (h) => ({ ...h, id: res.data.id }));
      return true;
    }
    setHabits((prev) => prev.filter((h) => h.id !== tempId));
    toast.error(res.error);
    return false;
  };

  const renameHabit = async (habitId: string, title: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit || isTempId(habitId) || habit.name === title) return;
    updateHabit(habitId, (h) => ({ ...h, name: title }));
    const res = await renameHabitAction(habitId, title);
    if (!res.ok) {
      updateHabit(habitId, (h) => ({ ...h, name: habit.name }));
      toast.error(res.error);
    }
  };

  const deleteHabit = async (habitId: string) => {
    const index = habits.findIndex((h) => h.id === habitId);
    if (index === -1 || isTempId(habitId)) return;
    const removed = habits[index];
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    const res = await deleteHabitAction(habitId);
    if (!res.ok) {
      setHabits((prev) => {
        const copy = [...prev];
        copy.splice(Math.min(index, copy.length), 0, removed);
        return copy;
      });
      toast.error(res.error);
    }
  };

  return {
    today,
    currentDay: today ? Number(today.slice(8, 10)) : null,
    daysInMonth: today ? monthLength(today) : 31,
    habits: views,
    isPending: (habitId: string, day: number) =>
      today ? pending.has(`${habitId}|${dateForDay(today, day)}`) : false,
    toggleDay,
    addHabit,
    renameHabit,
    deleteHabit,
  };
}
