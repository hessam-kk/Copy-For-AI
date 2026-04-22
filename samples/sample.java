package com.example;

import java.util.List;
import java.util.ArrayList;

public class Calculator {
    private final List<Double> history = new ArrayList<>();

    public double add(double a, double b) {
        history.add(a + b);
        return a + b;
    }

    protected static double multiply(double a, double b) {
        return a * b;
    }

    private synchronized void clear() {
        history.clear();
    }
}

class Runner {
    static void main(String[] args) {
        System.out.println("run");
    }
}
