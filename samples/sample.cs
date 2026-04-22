using System;

namespace Demo
{
    public struct Point
    {
        public int X { get; set; }
        public int Y { get; set; }

        public void Move(int dx, int dy)
        {
            X += dx;
            Y += dy;
        }

        public override string ToString() => $"({X}, {Y})";
    }

    public interface IShape
    {
        double Area();
    }

    public class Circle : IShape
    {
        public double Radius { get; set; }

        public double Area() => Math.PI * Radius * Radius;
    }
}
